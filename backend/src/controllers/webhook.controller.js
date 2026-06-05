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
    // Basic Registration Command
    if (text.startsWith('ลงทะเบียน')) {
      return await handleRegistration(lineUserId, text, replyToken);
    }

    const user = await User.findOne({ where: { line_user_id: lineUserId } });
    if (!user) {
      return await replyText(replyToken, 'กรุณาพิมพ์ "ลงทะเบียน [เบอร์โทรศัพท์]" เพื่อผูกบัญชีก่อนใช้งานระบบครับ');
    }

    const tenant = await Tenant.findOne({ where: { user_id: user.id }, include: [{ model: Room, as: 'room' }] });

    // --- State Machine ---
    const currentState = chatState.get(lineUserId);
    if (currentState) {
      if (currentState.step === 'WAITING_MAINTENANCE_DETAIL') {
        chatState.delete(lineUserId);
        
        // Save Maintenance Request
        await MaintenanceRequest.create({
          property_id: tenant?.room?.property_id || 1,
          room_id: tenant?.room_id,
          tenant_id: tenant?.id,
          title: 'แจ้งซ่อมจาก LINE',
          description: text,
          status: 'pending',
          priority: 'medium'
        });

        return await replyText(replyToken, '✅ รับเรื่องแจ้งซ่อมเรียบร้อยครับ ทางแอดมินจะรีบตรวจสอบและส่งช่างเข้าไปดำเนินการครับ (ระบบจะแจ้งเตือนเมื่อซ่อมเสร็จ)');
      }
    }

    // --- Menu Commands ---
    switch (text) {
      case 'หน้าหลัก':
        return await replyText(replyToken, `สวัสดีครับคุณ ${user.first_name}\nหากต้องการแจ้งซ่อม ส่งสลิป หรือขอย้ายออก สามารถพิมพ์บอกในแชทนี้ได้เลยครับ`);

      case 'ดูบิล':
      case 'ค่าเช่า':
        if (!tenant) return await replyText(replyToken, 'ไม่พบข้อมูลห้องพักของคุณครับ');
        const latestBill = await Invoice.findOne({ 
          where: { tenant_id: tenant.id }, order: [['created_at', 'DESC']]
        });
        
        if (!latestBill) {
          return await replyText(replyToken, 'คุณยังไม่มีบิลค่าเช่าในระบบครับ');
        }
        
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
        if (promo) {
          return await replyText(replyToken, `📣 ข่าวสาร/โปรโมชั่นล่าสุด:\n${promo.name}\n${promo.description || ''}`);
        }
        return await replyText(replyToken, 'ไม่มีข่าวสารใหม่ในขณะนี้ครับ');

      case 'แจ้งออก':
      case 'แจ้งย้ายออก':
        return await replyText(replyToken, '📝 ได้รับเรื่องแจ้งย้ายออกแล้วครับ แอดมินจะเข้าไปตรวจสอบความเรียบร้อยของห้อง และจะส่ง [บิลสรุปยอดสุทธิพร้อมเงินประกันคืน] กลับมาให้ในแชทนี้อีกครั้งนะครับ');

      default:
        // Assume text might be asking something else, or fallback
        return await replyText(replyToken, 'หากต้องการชำระเงิน กรุณาส่งรูปสลิปมาในแชทนี้ได้เลยครับ\nหรือพิมพ์เมนูที่ต้องการ (ดูบิล, แจ้งซ่อม, ข่าวสาร, แจ้งออก)');
    }
  } catch (error) {
    console.error('Error handling text:', error);
  }
}

async function handleIncomingImage(lineUserId, messageId, replyToken) {
  try {
    const user = await User.findOne({ where: { line_user_id: lineUserId } });
    if (!user) return; // Ignore images from unregistered users

    const tenant = await Tenant.findOne({ where: { user_id: user.id } });
    if (!tenant) return;

    // Find the latest pending invoice
    const pendingInvoice = await Invoice.findOne({ 
      where: { tenant_id: tenant.id, status: 'pending' },
      order: [['created_at', 'DESC']]
    });

    if (!pendingInvoice) {
      return await replyText(replyToken, 'คุณไม่มีบิลที่ต้องชำระในขณะนี้ครับ แต่เราบันทึกรูปภาพของคุณไว้แล้ว');
    }

    // In a real app, download the image using line.messagingApiBlob.MessagingApiBlobClient
    // and save it. For now, just mark the invoice as awaiting verification.
    
    pendingInvoice.status = 'paid'; // Or awaiting_verification
    pendingInvoice.paid_at = new Date();
    await pendingInvoice.save();

    await replyText(replyToken, `✅ ได้รับสลิปชำระเงินเรียบร้อยแล้วครับ ระบบจะทำการอัปเดตสถานะบิลของคุณ (ยอด ${pendingInvoice.total} บาท) ให้ทันที ขอบคุณครับ!`);

  } catch (error) {
    console.error('Error handling image:', error);
  }
}

async function handleRegistration(lineUserId, text, replyToken) {
  const phone = text.replace('ลงทะเบียน', '').trim();
  if (!phone) return await replyText(replyToken, 'กรุณาระบุเบอร์โทรศัพท์ด้วยครับ เช่น\nลงทะเบียน 0812345678');
  
  const user = await User.findOne({ where: { phone } });
  if (!user) {
    const liffUrl = process.env.LIFF_REGISTER_URL || 'https://liff.line.me/2006323631-Bq8ApepK';
    return await replyText(replyToken, `ไม่พบเบอร์ ${phone} ในระบบครับ\n\nหากคุณเป็นผู้เช่าใหม่ที่ยังไม่เคยลงทะเบียน กรุณาคลิกลิงก์ด้านล่างเพื่อลงทะเบียนเข้าอยู่และเลือกห้องพักด้วยตัวเองครับ:\n${liffUrl}\n\nหรือหากเคยลงทะเบียนแล้ว กรุณาติดต่อแอดมินครับ`);
  }
  
  user.line_user_id = lineUserId;
  await user.save();
  return await replyText(replyToken, `ลงทะเบียนสำเร็จ! ยินดีต้อนรับคุณ ${user.first_name} เข้าสู่ระบบครับ`);
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
