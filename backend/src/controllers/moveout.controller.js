const { MoveOutRequest, Room, Tenant, User, Property } = require('../models');
const line = require('@line/bot-sdk');

// Helper: create LINE client dynamically per property
async function getLineClient(propertyId) {
  const property = propertyId ? await Property.findByPk(propertyId) : null;
  const token = property?.line_channel_access_token || process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
  return new line.messagingApi.MessagingApiClient({ channelAccessToken: token });
}

exports.getAllRequests = async (req, res) => {
  try {
    const propertyId = req.query.property_id;
    const where = {};
    if (propertyId) {
      where.property_id = propertyId;
    }

    const requests = await MoveOutRequest.findAll({
      where,
      include: [
        { model: Room, as: 'room', attributes: ['id', 'room_number', 'status'] },
        { 
          model: Tenant, 
          as: 'tenant', 
          include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'phone'] }] 
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(requests);
  } catch (error) {
    console.error('Get all move out requests error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.updateRequestStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const request = await MoveOutRequest.findByPk(req.params.id, {
      include: [
        { model: Room, as: 'room' },
        { model: Tenant, as: 'tenant', include: [{ model: User, as: 'user' }] }
      ]
    });

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const oldStatus = request.status;
    request.status = status;
    if (notes !== undefined) {
      request.notes = notes;
    }
    await request.save();

    // If status is updated to 'inspected', we can optionally release the room back to available status
    if (status === 'inspected' && request.room) {
      // Free the room status
      request.room.status = 'available';
      await request.room.save();
      
      // Update tenant status to inactive/moved_out
      if (request.tenant) {
        request.tenant.status = 'moved_out';
        await request.tenant.save();
      }
    }

    // Send LINE Push Notification if user is linked to LINE
    const lineUserId = request.tenant?.user?.line_user_id;
    if (lineUserId && oldStatus !== status) {
      try {
        const client = await getLineClient(request.property_id);
        
        let messageText = '';
        const roomNumber = request.room?.room_number || '';
        const notesVal = notes || request.notes || '';

        if (status === 'approved') {
          messageText = `✅ คำร้องแจ้งย้ายออกได้รับการอนุมัติแล้วค่ะ สำหรับห้อง ${roomNumber}\n${notesVal}\n\nแอดมินจะดำเนินการขั้นต่อไปตามลำดับค่ะ`;
        } else if (status === 'inspected') {
          messageText = `🔍 ตรวจสอบห้องพักเรียบร้อยแล้วค่ะ สำหรับห้อง ${roomNumber}\n${notesVal}\n\nระบบได้ทำการบันทึกข้อมูลการคืนห้องพักเรียบร้อยแล้วค่ะ`;
        } else if (status === 'rejected') {
          messageText = `❌ คำร้องแจ้งย้ายออกถูกปฏิเสธค่ะ สำหรับห้อง ${roomNumber}\n💬 เหตุผลจากแอดมิน: ${notesVal}\n\nหากมีข้อสงสัยกรุณาติดต่อแอดมินค่ะ`;
        }

        if (messageText) {
          await client.pushMessage({
            to: lineUserId,
            messages: [{ type: 'text', text: messageText }]
          });
        }
      } catch (lineError) {
        console.error('Failed to send LINE push notification:', lineError);
      }
    }

    res.json(request);
  } catch (error) {
    console.error('Update move out request status error:', error);
    res.status(500).json({ message: error.message });
  }
};
