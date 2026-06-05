const line = require('@line/bot-sdk');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Room = require('../models/Room');
const Invoice = require('../models/Invoice');

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
};

// Create LINE client
const client = new line.messagingApi.MessagingApiClient(lineConfig);

exports.handleLineWebhook = async (req, res) => {
  try {
    const events = req.body.events;
    
    // Process each event asynchronously
    await Promise.all(events.map(async (event) => {
      if (event.type === 'message' && event.message.type === 'text') {
        const userId = event.source.userId;
        const text = event.message.text.trim();
        
        await handleIncomingText(userId, text, event.replyToken);
      }
    }));
    
    // LINE requires a 200 OK response quickly
    res.status(200).send('OK');
  } catch (error) {
    console.error('LINE webhook error:', error);
    // Even if error, reply 200 so LINE stops retrying aggressively
    res.status(200).send('OK');
  }
};

async function handleIncomingText(lineUserId, text, replyToken) {
  try {
    // 1. Account Linking
    if (text.startsWith('ลงทะเบียน')) {
      const phone = text.replace('ลงทะเบียน', '').trim();
      if (!phone) {
        return await client.replyMessage({
          replyToken: replyToken,
          messages: [{
            type: 'text',
            text: 'กรุณาระบุเบอร์โทรศัพท์ด้วยครับ เช่น\nลงทะเบียน 0812345678'
          }]
        });
      }
      
      const user = await User.findOne({ where: { phone } });
      if (!user) {
        return await client.replyMessage({
          replyToken: replyToken,
          messages: [{
            type: 'text',
            text: `ไม่พบเบอร์โทรศัพท์ ${phone} ในระบบครับ กรุณาติดต่อแอดมิน`
          }]
        });
      }
      
      user.line_user_id = lineUserId;
      // Get line profile
      try {
        const profile = await client.getProfile(lineUserId); // Note: getProfile is still on old client or MessagingApiClient might have it. Actually in v11 it's client.getProfile(lineUserId).
        user.line_display_name = profile.displayName;
      } catch (err) {
        console.error('Could not get profile:', err);
      }
      await user.save();
      
      return await client.replyMessage({
        replyToken: replyToken,
        messages: [{
          type: 'text',
          text: `ลงทะเบียนสำเร็จ! ยินดีต้อนรับคุณ ${user.first_name} สู่ระบบ SAMRUAY SPACE ครับ`
        }]
      });
    }

    // Check if user is linked for other commands
    const user = await User.findOne({ where: { line_user_id: lineUserId } });
    const isLinked = !!user;

    // Rich Menu Commands
    switch (text) {
      case 'หน้าหลัก':
        return await client.replyMessage({
          replyToken: replyToken,
          messages: [{
            type: 'text',
            text: isLinked ? `สวัสดีครับคุณ ${user.first_name}\nเลือกเมนูด้านล่างเพื่อดูข้อมูลหรือใช้บริการต่างๆ ได้เลยครับ` : 'สวัสดีครับ! กรุณาพิมพ์ "ลงทะเบียน [เบอร์โทรศัพท์]" เพื่อผูกบัญชีก่อนใช้งานเมนูต่างๆ ครับ'
          }]
        });

      case 'ดูบิล / ค่าเช่า':
        if (!isLinked) return sendNeedsLogin(replyToken);
        
        // Find latest billing
        const tenant = await Tenant.findOne({ where: { user_id: user.id }, include: [{ model: Room, as: 'room' }] });
        if (!tenant) {
          return await client.replyMessage({
            replyToken: replyToken,
            messages: [{ type: 'text', text: 'ไม่พบข้อมูลการเช่าห้องของคุณในระบบ' }]
          });
        }
        
        const latestBill = await Invoice.findOne({ 
          where: { tenant_id: tenant.id },
          order: [['created_at', 'DESC']]
        });
        
        if (!latestBill) {
          return await client.replyMessage({
            replyToken: replyToken,
            messages: [{ type: 'text', text: 'คุณยังไม่มีบิลค่าเช่าในระบบครับ' }]
          });
        }
        
        const statusText = latestBill.status === 'paid' ? '✅ ชำระแล้ว' : '⏳ รอชำระเงิน';
        const msg = `บิลค่าเช่าล่าสุดของคุณ:\nห้อง: ${tenant.room?.room_number || 'ไม่ระบุ'}\nยอดรวม: ฿${latestBill.total_amount}\nสถานะ: ${statusText}\nวันครบกำหนด: ${new Date(latestBill.due_date).toLocaleDateString('th-TH')}`;
        
        return await client.replyMessage({
          replyToken: replyToken,
          messages: [{ type: 'text', text: msg }]
        });

      case 'แจ้งชำระเงิน':
        if (!isLinked) return sendNeedsLogin(replyToken);
        return await client.replyMessage({
          replyToken: replyToken,
          messages: [{
            type: 'text',
            text: 'คุณสามารถพิมพ์จำนวนเงิน วันเวลาที่โอน หรือแนบสลิปส่งมาในแชทนี้ได้เลยครับ (ระบบอัปโหลดสลิปผ่านไลน์กำลังอยู่ระหว่างพัฒนา)'
          }]
        });

      case 'แจ้งซ่อม':
        if (!isLinked) return sendNeedsLogin(replyToken);
        return await client.replyMessage({
          replyToken: replyToken,
          messages: [{
            type: 'text',
            text: 'พบปัญหาอะไร แจ้งมาในแชทนี้ได้เลยครับ กรุณาพิมพ์คำว่า "ซ่อม:" นำหน้า เช่น\n"ซ่อม: แอร์ไม่เย็น"'
          }]
        });

      case 'แจ้งเข้า-ออก':
        if (!isLinked) return sendNeedsLogin(replyToken);
        return await client.replyMessage({
          replyToken: replyToken,
          messages: [{
            type: 'text',
            text: 'ต้องการแจ้งย้ายเข้าหรือย้ายออก โปรดพิมพ์รายละเอียดในแชทนี้ได้เลยครับ ทางแอดมินจะติดต่อกลับ'
          }]
        });

      case 'ข่าวสาร / โปรโมชั่น':
        return await client.replyMessage({
          replyToken: replyToken,
          messages: [{
            type: 'text',
            text: 'ไม่มีข่าวสารใหม่ในขณะนี้ครับ ขอบคุณที่ใช้บริการ SAMRUAY SPACE'
          }]
        });
        
      default:
        // Handle prefix cases (e.g. "ซ่อม: ...")
        if (text.startsWith('ซ่อม:')) {
          if (!isLinked) return sendNeedsLogin(replyToken);
          // In real app, create Maintenance record
          return await client.replyMessage({
            replyToken: replyToken,
            messages: [{
              type: 'text',
              text: 'รับเรื่องแจ้งซ่อมเรียบร้อยครับ ทางเราจะรีบดำเนินการตรวจสอบให้เร็วที่สุด'
            }]
          });
        }

        // Just ignore unknown messages or provide a generic fallback
        return await client.replyMessage({
          replyToken: replyToken,
          messages: [{
            type: 'text',
            text: 'ขออภัยครับ ระบบอัตโนมัติยังไม่เข้าใจข้อความนี้ กรุณาเลือกเมนูจากด้านล่าง หรือฝากข้อความไว้ให้แอดมินครับ'
          }]
        });
    }

  } catch (error) {
    console.error('Error handling text message:', error);
  }
}

async function sendNeedsLogin(replyToken) {
  return await client.replyMessage({
    replyToken: replyToken,
    messages: [{
      type: 'text',
      text: 'กรุณาพิมพ์ "ลงทะเบียน [เบอร์โทรศัพท์]" เพื่อผูกบัญชีของท่านก่อนใช้งานเมนูนี้ครับ'
    }]
  });
}
