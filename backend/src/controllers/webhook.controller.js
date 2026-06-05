const line = require('@line/bot-sdk');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { User, Tenant, Room, Invoice, MaintenanceRequest, Promotion } = require('../models');
const pdfService = require('../services/pdf.service');

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
};
const client = new line.messagingApi.MessagingApiClient(lineConfig);
const blobClient = new line.messagingApi.MessagingApiBlobClient(lineConfig);

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
    const isRegisterNew = text === 'ลงทะเบียนใหม่';
    const isRoomInquiry = /จอง|จองห้อง|ห้องว่าง|ห้องไหนว่าง|จองห้องพัก/.test(text);

    // --- Check User ---
    const user = await User.findOne({ where: { line_user_id: lineUserId } });
    const tenant = user ? await Tenant.findOne({ where: { user_id: user.id }, include: [{ model: Room, as: 'room' }] }) : null;

    // --- State Machine ---
    const currentState = chatState.get(lineUserId);
    if (currentState) {
      if (text === 'ยกเลิก') {
        chatState.delete(lineUserId);
        return await replyText(replyToken, 'ยกเลิกรายการปัจจุบันเรียบร้อยครับ');
      }

      if (currentState.step === 'WAITING_REGISTER_NAME') {
        const fullName = text.trim();
        const parts = fullName.split(' ');
        const first_name = parts[0];
        const last_name = parts.slice(1).join(' ') || '';
        
        chatState.set(lineUserId, { 
          step: 'WAITING_REGISTER_PHONE', 
          data: { first_name, last_name },
          timestamp: Date.now() 
        });
        return await replyText(replyToken, `รับทราบค่ะคุณ ${first_name}\nกรุณาพิมพ์ "เบอร์โทรศัพท์" ของคุณค่ะ (เช่น 0812345678)`);
      }

      if (currentState.step === 'WAITING_REGISTER_PHONE') {
        const phone = text.replace(/[^0-9]/g, '');
        if (phone.length < 9) {
          return await replyText(replyToken, 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง กรุณาพิมพ์ใหม่อีกครั้งค่ะ');
        }

        const availableRooms = await Room.findAll({
          where: { status: 'available' },
          order: [['room_number', 'ASC']]
        });

        let roomListStr = '';
        if (availableRooms.length > 0) {
          roomListStr = availableRooms.map(r => `ห้อง ${r.room_number}: ราคา ${parseFloat(r.price_override || 1500).toLocaleString()} บาท/เดือน`).join('\n');
        } else {
          chatState.delete(lineUserId);
          return await replyText(replyToken, 'ขออภัยค่ะ ขณะนี้ไม่มีห้องว่างเลยค่ะ ไม่สามารถจองได้ในขณะนี้');
        }

        chatState.set(lineUserId, {
          step: 'WAITING_REGISTER_ROOM',
          data: { ...currentState.data, phone },
          timestamp: Date.now()
        });

        return await replyText(replyToken, `ข้อมูลเบอร์โทรศัพท์ครบถ้วนค่ะ!\n\nตอนนี้มีห้องว่างดังนี้ค่ะ:\n${roomListStr}\n\nกรุณาพิมพ์ "เลขห้อง" ที่ต้องการจองค่ะ (เช่น 101)`);
      }

      if (currentState.step === 'WAITING_REGISTER_ROOM') {
        const match = text.match(/\d+/);
        if (!match) {
           return await replyText(replyToken, 'กรุณาระบุเลขห้องเป็นตัวเลขด้วยค่ะ (เช่น 101)');
        }
        const roomNum = match[0];
        
        const room = await Room.findOne({ where: { room_number: roomNum, status: 'available' } });
        
        if (!room) {
          return await replyText(replyToken, `ขออภัยค่ะ ไม่พบห้อง ${roomNum} หรือห้องนี้ไม่ว่างแล้ว กรุณาเลือกเลขห้องใหม่จากรายการค่ะ`);
        }

        // Execute Booking
        const { first_name, last_name, phone } = currentState.data;
        
        let dbUser = await User.findOne({ where: { phone } });
        if (!dbUser) {
          dbUser = await User.create({
            first_name,
            last_name,
            phone,
            line_user_id: lineUserId,
            role: 'tenant'
          });
        } else {
          dbUser.line_user_id = lineUserId;
          await dbUser.save();
        }

        const newTenant = await Tenant.create({ user_id: dbUser.id, room_id: room.id });
        room.status = 'reserved';
        await room.save();

        const deposit = 1000;
        const advanceRent = parseFloat(room.price_override || 1500);
        const totalAmount = deposit + advanceRent;

        await Invoice.create({
          invoice_number: `BK-${Date.now()}`,
          property_id: room.property_id,
          room_id: room.id,
          tenant_id: newTenant.id,
          period_month: new Date().getMonth() + 1,
          period_year: new Date().getFullYear(),
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
          total: totalAmount,
          status: 'pending',
          notes: 'ค่ามัดจำและค่าเช่าล่วงหน้า (จองห้อง)'
        }).catch(err => console.error("Invoice create error:", err));

        const { Notification } = require('../models');
        await Notification.create({
          title: 'จองห้องใหม่',
          message: `${first_name} ${last_name} จองห้อง ${room.room_number}`,
          type: 'registration',
          action_url: '/invoices'
        });

        chatState.delete(lineUserId);
        
        const successMsg = `ลงทะเบียน/จองห้องพักสำเร็จค่ะ!\n\nสรุปยอดชำระเงินเพื่อยืนยันการจอง (ค่าประกัน 1,000 บาท + ค่าเช่าล่วงหน้า 1 เดือน) เป็นจำนวนเงิน ${totalAmount.toLocaleString()} บาท ค่ะ\n\n🏦 ช่องทางการชำระเงิน:\nธนาคาร: กรุงไทย\nเลขที่บัญชี: 4373134715\nชื่อบัญชี: ธนกฤต หมู่บ้านม่วง\n\n⚠️ คำแนะนำ:\n\nหลังจากโอนเงินแล้ว รบกวน "ส่งรูปสลิป" กลับมาในแชทนี้ทันที เพื่อให้แอดมินตรวจสอบครับ\n\nหากมียอดโอนไม่ครบถ้วน หรือมีปัญหาในการชำระเงิน รบกวนแจ้ง ชื่อ-เลขห้อง ให้แอดมินทราบด้วยนะครับ\n\nขอบคุณที่ไว้วางใจใช้บริการหอพักแม่สำรวยครับ 🙏`;
        
        const appUrl = process.env.APP_URL || 'https://samruay-backend.onrender.com';
        return await client.replyMessage({
          replyToken: replyToken,
          messages: [
            { type: 'text', text: successMsg },
            { type: 'image', originalContentUrl: `${appUrl}/uploads/qr_code.jpg`, previewImageUrl: `${appUrl}/uploads/qr_code.jpg` }
          ]
        });
      }

      if (currentState.step === 'WAITING_MAINTENANCE_DETAIL') {
        const newReq = await MaintenanceRequest.create({
          property_id: tenant?.room?.property_id || 1,
          room_id: tenant?.room_id,
          tenant_id: tenant?.id,
          title: 'แจ้งซ่อมจาก LINE',
          description: text,
          status: 'pending',
          priority: 'medium',
          images: []
        });

        chatState.set(lineUserId, { step: 'WAITING_MAINTENANCE_MORE_IMAGES', requestId: newReq.id, timestamp: Date.now() });

        const { Notification } = require('../models');
        await Notification.create({
          title: 'แจ้งซ่อมใหม่',
          message: `ห้อง ${tenant?.room?.room_number || 'ไม่ทราบ'}: ${text.substring(0, 30)}...`,
          type: 'maintenance',
          action_url: '/maintenance'
        });

        return await replyText(replyToken, '✅ รับเรื่องแจ้งซ่อมเรียบร้อยครับ\nหากมีรูปภาพประกอบการซ่อม สามารถส่งรูปมาในแชทนี้ได้เลยครับ');
      }

      if (currentState.step === 'WAITING_MAINTENANCE_MORE_DETAILS') {
        const request = await MaintenanceRequest.findByPk(currentState.requestId);
        if (request) {
          request.description = (request.description && request.description !== 'แจ้งซ่อมด้วยภาพ' ? request.description + '\n' : '') + text;
          await request.save();
        }
        chatState.delete(lineUserId);
        return await replyText(replyToken, '✅ บันทึกรายละเอียดเพิ่มเติมเรียบร้อยครับ');
      }
    } // End of State Machine

    // If new registration requested
    if (isRegisterNew || text === 'ลงทะเบียน') {
      if (tenant && tenant.room) {
        return await replyText(replyToken, `ปัจจุบันคุณเข้าพักที่ ห้อง ${tenant.room.room_number} แล้วค่ะ ไม่ต้องลงทะเบียนใหม่นะคะ 😊`);
      }
      chatState.set(lineUserId, { step: 'WAITING_REGISTER_NAME', timestamp: Date.now() });
      return await replyText(replyToken, 'ยินดีค่ะ! เพื่อเริ่มขั้นตอนการจองห้องพัก กรุณากรอกข้อมูลตามนี้ทีละขั้นตอนนะคะ:\n\nพิมพ์ ชื่อ-นามสกุล ของคุณค่ะ');
    }

    if (text.startsWith('ลงทะเบียน ')) {
      return await handleOldRegistrationLinking(lineUserId, text, replyToken);
    }

    // Room inquiry
    if (isRoomInquiry) {
      if (tenant && tenant.room) {
        return await replyText(replyToken, `ปัจจุบันคุณเข้าพักที่ ห้อง ${tenant.room.room_number} แล้วค่ะ\n\nหากต้องการสอบถามข้อมูลอื่นๆ สามารถเลือกเมนูใน Rich Menu หรือพิมพ์สั่งงานได้เลยนะคะ:\n\nดูบิล: ตรวจสอบยอดชำระเดือนนี้\nแจ้งซ่อม: แจ้งปัญหาต่างๆ\nข่าวสาร: ดูโปรโมชั่นล่าสุด\nแจ้งออก: ทำเรื่องคืนห้องพัก`);
      } else {
        const availableRooms = await Room.findAll({
          where: { status: 'available' },
          order: [['room_number', 'ASC']]
        });

        if (availableRooms.length === 0) {
          return await replyText(replyToken, 'ขออภัยค่ะ ขณะนี้ไม่มีห้องว่างเลยค่ะ');
        }

        const roomListStr = availableRooms.map(r => `ห้อง ${r.room_number}: ราคา ${parseFloat(r.price_override || 1500).toLocaleString()} บาท/เดือน`).join('\n\n');
        
        return await replyText(replyToken, `ยินดีต้อนรับสู่หอพักแม่สำรวยค่ะ 😊\n\nตอนนี้มีห้องว่างที่พร้อมเข้าอยู่ดังนี้ค่ะ:\n\n${roomListStr}\n\nหากสนใจจองห้องพัก กรุณาพิมพ์คำว่า 'ลงทะเบียนใหม่' เพื่อเริ่มขั้นตอนการจองได้เลยค่ะ`);
      }
    }

    // --- Menu Commands for Registered Users ---
    if (!user || !tenant) {
      return await replyText(replyToken, `ขออภัยค่ะ พอดีฉันไม่ค่อยเข้าใจคำสั่งนี้ ลองเลือกจากเมนูด้านล่าง หรือพิมพ์คำว่า 'จองห้อง' เพื่อดูห้องว่างได้เลยนะคะ`);
    }

    switch (text) {
      case 'หน้าหลัก':
        return await replyText(replyToken, `สวัสดีค่ะคุณ ${user.first_name}\nหากต้องการแจ้งซ่อม ส่งสลิป หรือขอย้ายออก สามารถพิมพ์บอกในแชทนี้ได้เลยนะคะ`);

      case 'ดูบิล / ค่าเช่า':
      case 'ดูบิล':
      case 'ค่าเช่า':
        const latestBill = await Invoice.findOne({ 
          where: { 
            tenant_id: tenant.id,
            invoice_number: { [Op.notLike]: 'BK-%' } 
          }, 
          order: [['created_at', 'DESC']],
          include: [{ model: Room, as: 'Room' }]
        });
        
        if (!latestBill) return await replyText(replyToken, 'คุณยังไม่มีบิลค่าเช่ารายเดือนในระบบค่ะ');

        const appUrl = process.env.APP_URL || 'https://samruay-backend.onrender.com';
        const promptPayNumber = process.env.PROMPTPAY_NUMBER || '0949099502';
        const qrUrl = `https://promptpay.io/${promptPayNumber}/${latestBill.total}.png`;

        const invoiceFlex = {
          type: "flex",
          altText: `บิลค่าเช่าเดือน ${latestBill.period_month}/${latestBill.period_year}`,
          contents: {
            type: "bubble",
            hero: {
              type: "image",
              url: "https://samruay-space.vercel.app/logo.png",
              size: "full",
              aspectRatio: "20:13",
              aspectMode: "fit",
              backgroundColor: "#ffffff"
            },
            header: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "text",
                  text: "บิลเงินสด / ใบแจ้งหนี้",
                  weight: "bold",
                  color: "#1DB446",
                  size: "xl",
                  align: "center"
                },
                {
                  type: "text",
                  text: `ห้อง ${latestBill.Room?.room_number || '-'} | รอบบิล ${latestBill.period_month}/${latestBill.period_year}`,
                  size: "md",
                  color: "#aaaaaa",
                  align: "center",
                  margin: "sm"
                }
              ]
            },
            body: {
              type: "box",
              layout: "vertical",
              contents: [
                { type: "separator", margin: "xxl" },
                {
                  type: "box", layout: "horizontal", margin: "xxl",
                  contents: [
                    { type: "text", text: "ค่าเช่าห้อง", size: "sm", color: "#555555" },
                    { type: "text", text: `${parseFloat(latestBill.room_price || 0).toLocaleString()} ฿`, size: "sm", color: "#111111", align: "end" }
                  ]
                },
                {
                  type: "box", layout: "horizontal", margin: "md",
                  contents: [
                    { type: "text", text: `ค่าน้ำ (${latestBill.water_units} หน่วย)`, size: "sm", color: "#555555" },
                    { type: "text", text: `${parseFloat(latestBill.water_amount || 0).toLocaleString()} ฿`, size: "sm", color: "#111111", align: "end" }
                  ]
                },
                {
                  type: "box", layout: "horizontal", margin: "md",
                  contents: [
                    { type: "text", text: `ค่าไฟ (${latestBill.elec_units} หน่วย)`, size: "sm", color: "#555555" },
                    { type: "text", text: `${parseFloat(latestBill.elec_amount || 0).toLocaleString()} ฿`, size: "sm", color: "#111111", align: "end" }
                  ]
                },
                ...(parseFloat(latestBill.late_fee) > 0 ? [{
                  type: "box", layout: "horizontal", margin: "md",
                  contents: [
                    { type: "text", text: "ค่าปรับล่าช้า", size: "sm", color: "#555555" },
                    { type: "text", text: `${parseFloat(latestBill.late_fee).toLocaleString()} ฿`, size: "sm", color: "#111111", align: "end" }
                  ]
                }] : []),
                { type: "separator", margin: "xxl" },
                {
                  type: "box", layout: "horizontal", margin: "xxl",
                  contents: [
                    { type: "text", text: "ยอดรวมทั้งสิ้น", size: "md", color: "#555555" },
                    { type: "text", text: `${parseFloat(latestBill.total).toLocaleString()} ฿`, size: "lg", color: "#ff0000", weight: "bold", align: "end" }
                  ]
                },
                {
                  type: "box", layout: "horizontal", margin: "md",
                  contents: [
                    { type: "text", text: "สถานะ", size: "sm", color: "#555555" },
                    { type: "text", text: latestBill.status === 'paid' ? '✅ ชำระแล้ว' : '❌ ยังไม่ชำระ', size: "sm", color: latestBill.status === 'paid' ? "#1DB446" : "#ff0000", weight: "bold", align: "end" }
                  ]
                }
              ]
            },
            footer: {
              type: "box",
              layout: "vertical",
              contents: [
                ...(latestBill.status !== 'paid' ? [
                  {
                    type: "button",
                    style: "primary",
                    color: "#1DB446",
                    margin: "sm",
                    action: {
                      type: "message",
                      label: "สแกน QR จ่ายเงิน",
                      text: "ขอ QR Code สแกนจ่าย"
                    }
                  },
                  {
                    type: "button",
                    style: "secondary",
                    margin: "sm",
                    action: {
                      type: "message",
                      label: "แจ้งชำระเงิน (ส่งสลิป)",
                      text: "แจ้งชำระเงิน"
                    }
                  }
                ] : []),
                ...(latestBill.pdf_url ? [
                  {
                    type: "button",
                    style: "link",
                    margin: "sm",
                    action: {
                      type: "uri",
                      label: "ดาวน์โหลด PDF บิลเต็ม",
                      uri: `${appUrl}${latestBill.pdf_url}`
                    }
                  }
                ] : [])
              ]
            }
          }
        };
        
        return await client.replyMessage({
          replyToken: replyToken,
          messages: [invoiceFlex]
        });

      case 'ขอ QR Code สแกนจ่าย':
        const billForQr = await Invoice.findOne({ 
          where: { tenant_id: tenant.id, status: 'pending', invoice_number: { [Op.notLike]: 'BK-%' } }, 
          order: [['created_at', 'DESC']]
        });
        
        if (!billForQr) return await replyText(replyToken, 'คุณไม่มีบิลที่รอการชำระเงินค่ะ');
        
        const ppNumber = process.env.PROMPTPAY_NUMBER || '0949099502';
        const generatedQrUrl = `https://promptpay.io/${ppNumber}/${billForQr.total}.png`;
        
        return await client.replyMessage({
          replyToken: replyToken,
          messages: [
            {
              type: 'image',
              originalContentUrl: generatedQrUrl,
              previewImageUrl: generatedQrUrl
            },
            {
              type: 'text',
              text: `สแกน QR Code เพื่อชำระยอด ${parseFloat(billForQr.total).toLocaleString()} บาท\nเมื่อโอนเสร็จแล้ว กดปุ่ม "แจ้งชำระเงิน" หรือพิมพ์ส่งรูปสลิปเข้ามาในแชทได้เลยค่ะ!`
            }
          ]
        });

      case 'เสกบิล':
        const roomPrice = parseFloat(tenant.Room?.price_override || 1500);
        
        // Month 4 (Paid)
        await Invoice.create({
          invoice_number: `INV-202604-${tenant.Room?.room_number || tenant.room_id}`,
          property_id: tenant.Room?.property_id || 1,
          room_id: tenant.room_id,
          tenant_id: tenant.id,
          period_month: 4,
          period_year: 2026,
          issue_date: new Date('2026-04-25'),
          due_date: new Date('2026-05-05'),
          room_price: roomPrice,
          water_previous: 100, water_current: 105, water_units: 5, water_rate: 20, water_amount: 100,
          elec_previous: 1000, elec_current: 1100, elec_units: 100, elec_rate: 8, elec_amount: 800,
          subtotal: roomPrice + 100 + 800, total: roomPrice + 100 + 800,
          status: 'paid', notes: 'บิลเดือนเมษายน 2026'
        }).catch(err => console.log('Mock Apr error:', err));

        // Month 5 (Pending)
        await Invoice.create({
          invoice_number: `INV-202605-${tenant.Room?.room_number || tenant.room_id}`,
          property_id: tenant.Room?.property_id || 1,
          room_id: tenant.room_id,
          tenant_id: tenant.id,
          period_month: 5,
          period_year: 2026,
          issue_date: new Date('2026-05-25'),
          due_date: new Date('2026-06-05'),
          room_price: roomPrice,
          water_previous: 105, water_current: 112, water_units: 7, water_rate: 20, water_amount: 140,
          elec_previous: 1100, elec_current: 1250, elec_units: 150, elec_rate: 8, elec_amount: 1200,
          subtotal: roomPrice + 140 + 1200, total: roomPrice + 140 + 1200,
          status: 'pending', notes: 'บิลเดือนพฤษภาคม 2026'
        }).catch(err => console.log('Mock May error:', err));
        
        return await replyText(replyToken, '✨ เสกบิลจำลองของเดือน 4 และ 5 สำเร็จเรียบร้อยแล้วค่ะ!\n\nลองกดปุ่ม "ดูบิล / ค่าเช่า" อีกครั้งได้เลยค่ะ');

      case 'แจ้งชำระเงิน':
        return await replyText(replyToken, 'กรุณาส่งรูปภาพสลิปโอนเงิน หรือหลักฐานการชำระเงินเข้ามาในแชทนี้ได้เลยค่ะ ทางเราจะรีบตรวจสอบให้ทันทีครับ');

      case 'แจ้งซ่อม':
        chatState.set(lineUserId, { step: 'WAITING_MAINTENANCE_DETAIL', timestamp: Date.now() });
        return await replyText(replyToken, '🛠️ คุณต้องการแจ้งซ่อมเรื่องอะไรคะ?\n(พิมพ์รายละเอียด หรือส่งรูปภาพสถานที่ชำรุดมาในแชทนี้ได้เลยค่ะ)');

      case 'ข่าวสาร / โปรโมชั่น':
      case 'ข่าวสาร':
        const promo = await Promotion.findOne({ order: [['created_at', 'DESC']] });
        if (promo) {
          const messages = [];
          if (promo.image_url) {
            const appUrl = process.env.APP_URL || 'https://samruay-backend.onrender.com';
            const imageUrl = `${appUrl}${promo.image_url}`;
            messages.push({
              type: 'image',
              originalContentUrl: imageUrl,
              previewImageUrl: imageUrl
            });
          }
          messages.push({
            type: 'text',
            text: `📣 ข่าวสาร/โปรโมชั่นล่าสุด:\n${promo.name}\n${promo.description || ''}`
          });
          return await client.replyMessage({
            replyToken: replyToken,
            messages
          });
        }
        return await replyText(replyToken, 'ในเดือนนี้ยังไม่มีกิจกรรมหรือโปรโมชั่นพิเศษ กรุณารอติดตามข่าวสารดีๆ จากเราได้เร็วๆ นี้นะคะ 💖');

      case 'แจ้งออก':
      case 'แจ้งย้ายออก':
        return await replyText(replyToken, '📝 ได้รับเรื่องแจ้งย้ายออกแล้วค่ะ แอดมินจะเข้าไปตรวจสอบความเรียบร้อยของห้อง และจะส่ง [บิลสรุปยอดสุทธิพร้อมเงินประกันคืน] กลับมาให้ในแชทนี้นะคะ');

      default:
        return await replyText(replyToken, `ขออภัยค่ะ พอดีฉันไม่ค่อยเข้าใจคำสั่งนี้ ลองเลือกจากเมนูด้านล่าง หรือส่งรูปสลิปเพื่อชำระเงินได้เลยนะคะ`);
    }
  } catch (error) {
    console.error('Error handling text:', error);
  }
}

async function handleIncomingImage(lineUserId, messageId, replyToken) {
  try {
    const user = await User.findOne({ where: { line_user_id: lineUserId } });
    if (!user) {
      await replyText(replyToken, '❌ ไม่พบข้อมูลบัญชีผู้ใช้งานของคุณในระบบ');
      return;
    }

    const tenant = await Tenant.findOne({ where: { user_id: user.id }, order: [['created_at', 'DESC']], include: [{ model: Room, as: 'room' }] });
    if (!tenant) {
      await replyText(replyToken, '❌ ไม่พบข้อมูลการเช่าห้องของคุณในระบบ');
      return;
    }

    const currentState = chatState.get(lineUserId);

    if (currentState && currentState.step === 'WAITING_MAINTENANCE_DETAIL') {
      const stream = await blobClient.getMessageContent(messageId);
      const ext = 'jpg';
      const filename = `maint-${Date.now()}.${ext}`;
      const dir = path.join(__dirname, '../../uploads/maintenance');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, filename);
      
      const chunks = [];
      for await (const chunk of stream) chunks.push(Buffer.from(chunk));
      fs.writeFileSync(filePath, Buffer.concat(chunks));

      const imageUrl = `/uploads/maintenance/${filename}`;

      const newReq = await MaintenanceRequest.create({
        property_id: tenant?.room?.property_id || 1,
        room_id: tenant?.room_id,
        tenant_id: tenant?.id,
        title: 'แจ้งซ่อมจาก LINE',
        description: 'แจ้งซ่อมด้วยภาพ',
        status: 'pending',
        priority: 'medium',
        images: [{ type: 'tenant', url: imageUrl }]
      });

      chatState.set(lineUserId, { step: 'WAITING_MAINTENANCE_MORE_DETAILS', requestId: newReq.id, timestamp: Date.now() });

      const { Notification } = require('../models');
      await Notification.create({
        title: 'แจ้งซ่อมใหม่',
        message: `ห้อง ${tenant?.room?.room_number || 'ไม่ทราบ'} ส่งภาพแจ้งซ่อม`,
        type: 'maintenance',
        action_url: '/maintenance'
      });

      return await replyText(replyToken, '✅ รับเรื่องแจ้งซ่อมเรียบร้อยครับ\nหากมีรายละเอียดเพิ่มเติม สามารถพิมพ์บอกมาในแชทได้เลยครับ');
    }

    if (currentState && currentState.step === 'WAITING_MAINTENANCE_MORE_IMAGES') {
      const request = await MaintenanceRequest.findByPk(currentState.requestId);
      if (request) {
         const stream = await blobClient.getMessageContent(messageId);
         const ext = 'jpg';
         const filename = `maint-${Date.now()}.${ext}`;
         const dir = path.join(__dirname, '../../uploads/maintenance');
         if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
         const filePath = path.join(dir, filename);
         
         const chunks = [];
         for await (const chunk of stream) chunks.push(Buffer.from(chunk));
         fs.writeFileSync(filePath, Buffer.concat(chunks));
 
         const imageUrl = `/uploads/maintenance/${filename}`;
         const currentImages = request.images || [];
         request.images = [...currentImages, { type: 'tenant', url: imageUrl }];
         await request.save();
      }
      chatState.delete(lineUserId);
      return await replyText(replyToken, '✅ บันทึกรูปภาพประกอบเรียบร้อยครับ แอดมินจะรีบตรวจสอบครับ');
    }

    const { Op } = require('sequelize');
    const pendingInvoice = await Invoice.findOne({ 
      where: { tenant_id: tenant.id, status: { [Op.in]: ['pending', 'partial'] } },
      order: [['created_at', 'DESC']]
    });

    if (!pendingInvoice) {
      return await replyText(replyToken, 'คุณไม่มีบิลที่ต้องชำระในขณะนี้ครับ แต่เราบันทึกรูปภาพของคุณไว้แล้ว');
    }

    // Download image from LINE as buffer
    const stream = await blobClient.getMessageContent(messageId);
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    
    const base64Image = `data:image/jpeg;base64,${buffer.toString('base64')}`;

    const { Payment } = require('../models');
    await Payment.create({
      invoice_id: pendingInvoice.id,
      amount: pendingInvoice.total - (pendingInvoice.paid_amount || 0),
      method: 'bank_transfer',
      slip_image: base64Image,
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
    await replyText(replyToken, `❌ เกิดข้อผิดพลาดในระบบ: ${error.message}`);
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
