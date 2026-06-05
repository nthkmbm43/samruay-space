const line = require('@line/bot-sdk');
const fs = require('fs');
const path = require('path');
const { User, Tenant, Room, Invoice, MaintenanceRequest, Promotion } = require('../models');
const pdfService = require('../services/pdf.service');

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
};
const client = new line.messagingApi.MessagingApiClient(lineConfig);

// Simple In-Memory State for Chatbot (Ideally use Redis in production)
const chatState = new Map();

exports.handleLineWebhook = async (req, res) => {
  try {
    const events = req.body.events;
    await Promise.all(events.map(async (event) => {
      const userId = event.source.userId;
      
      if (event.type === 'message' && event.message.type === 'text') {
        await handleIncomingText(userId, event.message.text.trim(), event.replyToken);
      } else if (event.type === 'message' && event.message.type === 'image') {
        await handleIncomingImage(userId, event.message.id, event.replyToken);
      }
    }));
    res.status(200).send('OK');
  } catch (error) {
    console.error('LINE webhook error:', error);
    res.status(200).send('OK');
  }
};

async function handleIncomingText(lineUserId, text, replyToken) {
  try {
    const user = await User.findOne({ where: { line_user_id: lineUserId } });
    const tenant = user ? await Tenant.findOne({ where: { user_id: user.id }, include: [{ model: Room, as: 'room' }] }) : null;

    const bookingKeywords = ['จอง', 'จองห้อง', 'จองห้องพัก', 'ห้องว่าง', 'ห้องไหนว่าง', 'มีห้องว่างไหม'];
    const isBookingQuery = bookingKeywords.some(kw => text.includes(kw)) && !text.startsWith('จองห้อง ');

    // Helper function to show rooms
    const showAvailableRooms = async (footerText) => {
      const availableRooms = await Room.findAll({ where: { status: 'available' }, order: [['room_number', 'ASC']] });
      if (availableRooms.length === 0) return await replyText(replyToken, 'ขออภัยครับ ขณะนี้ไม่มีห้องว่างเลยครับ กรุณาติดต่อแอดมิน');
      const roomListStr = availableRooms.map(r => `🔹 ห้อง ${r.room_number}`).join('\n');
      return await replyText(replyToken, `นี่คือห้องที่ว่างอยู่ตอนนี้ครับ:\n\n${roomListStr}\n\n${footerText}`);
    };

    // --- State Machine ---
    const currentState = chatState.get(lineUserId);
    if (currentState) {
      if (currentState.step === 'WAITING_REGISTER_NAME') {
        const parts = text.trim().split(' ');
        chatState.set(lineUserId, { step: 'WAITING_REGISTER_PHONE', data: { first_name: parts[0], last_name: parts.slice(1).join(' ') || '' }, timestamp: Date.now() });
        return await replyText(replyToken, `รับทราบครับคุณ ${parts[0]}\nกรุณาพิมพ์ "เบอร์โทรศัพท์" ของคุณครับ (เช่น 0812345678)`);
      }

      if (currentState.step === 'WAITING_REGISTER_PHONE') {
        const phone = text.replace(/[^0-9]/g, '');
        if (phone.length < 9) return await replyText(replyToken, 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง กรุณาพิมพ์ใหม่อีกครั้งครับ');
        
        chatState.set(lineUserId, { step: 'WAITING_REGISTER_ROOM', data: { ...currentState.data, phone }, timestamp: Date.now() });
        return await showAvailableRooms('หากสนใจจอง กรุณาพิมพ์คำว่า "จองห้อง ตามด้วยเลขห้อง" ครับ (เช่น จองห้อง 101)');
      }

      if (currentState.step === 'WAITING_REGISTER_ROOM') {
        if (!text.startsWith('จองห้อง')) return await replyText(replyToken, 'กรุณาพิมพ์คำว่า "จองห้อง ตามด้วยเลขห้อง" (เช่น จองห้อง 101) เพื่อยืนยันครับ หรือพิมพ์ "ยกเลิก"');
        
        const roomNum = text.replace('จองห้อง', '').trim();
        const room = await Room.findOne({ where: { room_number: roomNum, status: 'available' }, include: ['RoomType'] });
        if (!room) return await replyText(replyToken, `ขออภัยครับ ไม่พบห้อง ${roomNum} หรือห้องนี้ไม่ว่างแล้ว กรุณาเลือกเลขห้องใหม่ครับ`);

        // Execute Booking
        const { first_name, last_name, phone } = currentState.data;
        let bookingUser = await User.findOne({ where: { phone } });
        if (!bookingUser) bookingUser = await User.create({ first_name, last_name, phone, line_user_id: lineUserId, role: 'tenant' });
        else { bookingUser.line_user_id = lineUserId; await bookingUser.save(); }

        const newTenant = await Tenant.create({ user_id: bookingUser.id, room_id: room.id });
        room.status = 'reserved';
        await room.save();

        const deposit = 1000;
        const advanceRent = parseFloat(room.price_override || (room.RoomType && room.RoomType.base_price) || 1500);
        const totalAmount = deposit + advanceRent;

        await Invoice.create({
          invoice_number: `BK-${Date.now()}`, property_id: room.property_id, room_id: room.id, tenant_id: newTenant.id,
          period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear(),
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), total: totalAmount, status: 'pending', notes: 'ค่ามัดจำและค่าเช่าล่วงหน้า (จองห้อง)'
        });

        const { Notification } = require('../models');
        await Notification.create({ title: 'จองห้องใหม่', message: `${first_name} ${last_name} จองห้อง ${room.room_number}`, type: 'registration', action_url: '/invoices' });

        chatState.delete(lineUserId);
        return await replyText(replyToken, `🎉 ยินดีด้วยครับ! คุณได้สิทธิ์จองห้อง ${room.room_number} เรียบร้อยแล้วครับ\n\nยอดที่ต้องชำระเพื่อยืนยันสิทธิ์ภายใน 3 วันคือ:\n- ค่าประกัน: 1,000 บาท\n- ค่าเช่าล่วงหน้า: ${advanceRent} บาท\nสรุปยอดชำระคือ ${totalAmount} บาท\n\nสามารถโอนเข้าบัญชีด้านล่างนี้ และแนบรูปสลิปส่งกลับมาในแชทได้เลยค่ะ\n\n🏦 ธนาคาร: กรุงไทย\nเลขที่บัญชี: 4373134715\nชื่อบัญชี: ธนกฤต หมู่บ้านม่วง`);
      }

      if (currentState.step === 'WAITING_MAINTENANCE_DETAIL') {
        chatState.delete(lineUserId);
        await MaintenanceRequest.create({ property_id: tenant?.room?.property_id || 1, room_id: tenant?.room_id, tenant_id: tenant?.id, title: 'แจ้งซ่อมจาก LINE', description: text, status: 'pending', priority: 'medium' });
        const { Notification } = require('../models');
        await Notification.create({ title: 'แจ้งซ่อมใหม่', message: `ห้อง ${tenant?.room?.room_number || 'ไม่ทราบ'}: ${text.substring(0, 30)}...`, type: 'maintenance', action_url: '/maintenance' });
        return await replyText(replyToken, '✅ รับเรื่องแจ้งซ่อมเรียบร้อยครับ ทางแอดมินจะรีบตรวจสอบและส่งช่างเข้าไปดำเนินการครับ (ระบบจะแจ้งเตือนเมื่อซ่อมเสร็จ)');
      }
    }

    if (text === 'ยกเลิก') {
      chatState.delete(lineUserId);
      return await replyText(replyToken, 'ยกเลิกรายการปัจจุบันเรียบร้อยครับ');
    }

    // --- Unregistered User Flow ---
    if (!user) {
      if (text === 'ลงทะเบียนใหม่') {
        chatState.set(lineUserId, { step: 'WAITING_REGISTER_NAME', timestamp: Date.now() });
        return await replyText(replyToken, 'ยินดีต้อนรับครับ! เพื่อความสะดวกรวดเร็ว\nกรุณาพิมพ์ "ชื่อ-นามสกุล" ของคุณครับ');
      }
      if (text.startsWith('ลงทะเบียน')) {
        return await handleOldRegistrationLinking(lineUserId, text, replyToken);
      }
      if (isBookingQuery) {
        return await showAvailableRooms("หากต้องการจองห้องพัก กรุณาพิมพ์คำว่า 'ลงทะเบียนใหม่' เพื่อดำเนินการครับ");
      }
      return await replyText(replyToken, 'คุณยังไม่ได้ลงทะเบียนครับ\nพิมพ์ "ลงทะเบียนใหม่" เพื่อเริ่มจองห้องพัก หรือพิมพ์ "ลงทะเบียน [เบอร์โทร]" เพื่อผูกบัญชีเดิมครับ');
    }

    // --- Registered User Flow ---
    if (isBookingQuery) {
      if (!tenant) {
        chatState.set(lineUserId, { step: 'WAITING_REGISTER_ROOM', data: { first_name: user.first_name, last_name: user.last_name, phone: user.phone }, timestamp: Date.now() });
        return await showAvailableRooms("คุณมีบัญชีอยู่แล้ว! หากต้องการจองห้อง กรุณาพิมพ์คำว่า 'จองห้อง ตามด้วยเลขห้อง' ครับ (เช่น จองห้อง 101)");
      } else {
        return await showAvailableRooms("คุณเป็นผู้เช่าอยู่แล้ว หากต้องการย้ายห้องหรือจองเพิ่ม กรุณาติดต่อแอดมินครับ");
      }
    }

    // Menu Commands for Registered Users
    switch (text) {
      case 'หน้าหลัก': return await replyText(replyToken, `สวัสดีครับคุณ ${user.first_name}\nหากต้องการแจ้งซ่อม ส่งสลิป หรือขอย้ายออก สามารถพิมพ์บอกในแชทนี้ได้เลยครับ`);
      case 'ดูบิล':
      case 'ค่าเช่า':
        if (!tenant) return await replyText(replyToken, 'ไม่พบข้อมูลห้องพักของคุณครับ');
        const latestBill = await Invoice.findOne({ where: { tenant_id: tenant.id }, order: [['created_at', 'DESC']] });
        if (!latestBill) return await replyText(replyToken, 'คุณยังไม่มีบิลค่าเช่าในระบบครับ');
        if (latestBill.pdf_url) {
          const appUrl = process.env.APP_URL || 'https://samruay-backend.onrender.com';
          return await replyText(replyToken, `บิลค่าเช่าเดือนล่าสุดยอด: ${latestBill.total} บาท\nสถานะ: ${latestBill.status}\n\nคลิกเพื่อดูใบแจ้งหนี้ PDF:\n${appUrl}${latestBill.pdf_url}`);
        } else {
          return await replyText(replyToken, `บิลค่าเช่ายอด: ${latestBill.total} บาท (สถานะ: ${latestBill.status})`);
        }
      case 'แจ้งซ่อม':
        chatState.set(lineUserId, { step: 'WAITING_MAINTENANCE_DETAIL', timestamp: Date.now() });
        return await replyText(replyToken, '🛠️ คุณต้องการแจ้งซ่อมเรื่องอะไรครับ?\n(พิมพ์รายละเอียดส่งมาในแชทนี้ได้เลยครับ เช่น แอร์ไม่เย็น, ท่อน้ำซึม)');
      case 'ข่าวสาร':
        const promo = await Promotion.findOne({ order: [['created_at', 'DESC']] });
        if (promo) return await replyText(replyToken, `📣 ข่าวสาร/โปรโมชั่นล่าสุด:\n${promo.name}\n${promo.description || ''}`);
        return await replyText(replyToken, 'ไม่มีข่าวสารใหม่ในขณะนี้ครับ');
      case 'แจ้งออก':
      case 'แจ้งย้ายออก':
        return await replyText(replyToken, '📝 ได้รับเรื่องแจ้งย้ายออกแล้วครับ แอดมินจะเข้าไปตรวจสอบความเรียบร้อยของห้อง และจะส่ง [บิลสรุปยอดสุทธิพร้อมเงินประกันคืน] กลับมาให้ในแชทนี้อีกครั้งนะครับ');
      default:
        // Default only triggers if it's an unrecognized command
        return await replyText(replyToken, 'หากต้องการชำระเงิน กรุณาส่งรูปสลิปมาในแชทนี้ได้เลยครับ\nหรือพิมพ์เมนูที่ต้องการ (จองห้องพัก, ดูบิล, แจ้งซ่อม, ข่าวสาร, แจ้งออก)');
    }
  } catch (error) {
    console.error('Error handling text:', error);
  }
}

async function handleIncomingImage(lineUserId, messageId, replyToken) {
  try {
    const user = await User.findOne({ where: { line_user_id: lineUserId } });
    if (!user) return; // Ignore images from unregistered users

    const tenant = await Tenant.findOne({ where: { user_id: user.id }, include: [{ model: Room, as: 'room' }] });
    if (!tenant) return;

    const { Op } = require('sequelize');
    const pendingInvoice = await Invoice.findOne({ 
      where: { tenant_id: tenant.id, status: { [Op.in]: ['pending', 'partial'] } },
      order: [['created_at', 'DESC']]
    });

    if (!pendingInvoice) {
      return await replyText(replyToken, 'คุณไม่มีบิลที่ต้องชำระในขณะนี้ครับ แต่เราบันทึกรูปภาพของคุณไว้แล้ว');
    }

    // Download image from LINE
    const stream = await client.getMessageContent(messageId);
    const filename = `slip-${Date.now()}.jpg`;
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    
    const filepath = path.join(uploadsDir, filename);
    const writeStream = fs.createWriteStream(filepath);
    
    stream.pipe(writeStream);
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    const slipUrl = `/uploads/${filename}`;

    const { Payment } = require('../models');
    await Payment.create({
      invoice_id: pendingInvoice.id,
      amount: pendingInvoice.total - (pendingInvoice.paid_amount || 0),
      method: 'bank_transfer',
      slip_image: slipUrl,
      status: 'pending'
    });

    pendingInvoice.status = 'awaiting_verification';
    await pendingInvoice.save();

    const { Notification } = require('../models');
    await Notification.create({
      title: 'แนบสลิปชำระเงิน',
      message: `ห้อง ${tenant.room?.room_number || 'ไม่ทราบ'} แนบสลิปยอด ${pendingInvoice.total} บาท รอการตรวจสอบ`,
      type: 'payment',
      action_url: '/invoices'
    });

    await replyText(replyToken, `✅ ได้รับสลิปชำระเงินเรียบร้อยแล้วครับ ระบบได้ส่งเรื่องให้แอดมินตรวจสอบยอด ${pendingInvoice.total} บาท\nรอแอดมินยืนยันสักครู่นะครับ!`);

  } catch (error) {
    console.error('Error handling image:', error);
  }
}

async function handleOldRegistrationLinking(lineUserId, text, replyToken) {
  const phone = text.replace('ลงทะเบียน', '').trim();
  if (!phone) return await replyText(replyToken, 'พิมพ์ "ลงทะเบียนใหม่" เพื่อจองห้องพัก\nหรือพิมพ์ "ลงทะเบียน 0812345678" เพื่อผูกเบอร์เดิมครับ');
  
  const user = await User.findOne({ where: { phone } });
  if (!user) {
    return await replyText(replyToken, `ไม่พบเบอร์ ${phone} ในระบบครับ\nหากต้องการจองห้องพักใหม่ พิมพ์คำว่า "ลงทะเบียนใหม่" ได้เลยครับ`);
  }
  
  user.line_user_id = lineUserId;
  await user.save();
  return await replyText(replyToken, `ผูกบัญชีสำเร็จ! ยินดีต้อนรับคุณ ${user.first_name} เข้าสู่ระบบครับ`);
}

async function replyText(replyToken, text) {
  return await client.replyMessage({
    replyToken: replyToken,
    messages: [{ type: 'text', text }]
  });
}

// Utility for sending Push Messages from Admin Dashboard
exports.sendPushMessage = async (userId, text) => {
  try {
    const user = await User.findByPk(userId);
    if (user && user.line_user_id) {
      await client.pushMessage({
        to: user.line_user_id,
        messages: [{ type: 'text', text }]
      });
    }
  } catch (error) {
    console.error('Push Message Failed:', error);
  }
};
