const { MaintenanceRequest, Room, Tenant, User, Property } = require('../models');
const line = require('@line/bot-sdk');

// Helper: create LINE client dynamically per property
async function getLineClient(propertyId) {
  const property = propertyId ? await Property.findByPk(propertyId) : null;
  const token = property?.line_channel_access_token || process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
  return new line.messagingApi.MessagingApiClient({ channelAccessToken: token });
}

exports.getAllRequests = async (req, res) => {
  try {
    const requests = await MaintenanceRequest.findAll({
      include: [
        { model: Room, attributes: ['room_number'] },
        { model: Tenant, include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }] }
      ]
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createRequest = async (req, res) => {
  try {
    const { room_id, tenant_id, title, description, priority } = req.body;
    const request = await MaintenanceRequest.create({
      room_id, tenant_id, title, description, priority, status: 'pending'
    });
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRequestById = async (req, res) => {
  try {
    const request = await MaintenanceRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'Not found' });
    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateRequest = async (req, res) => {
  try {
    const request = await MaintenanceRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'Not found' });
    await request.update(req.body);
    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteRequest = async (req, res) => {
  try {
    const request = await MaintenanceRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'Not found' });
    await request.destroy();
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateRequestStatus = async (req, res) => {
  try {
    const request = await MaintenanceRequest.findByPk(req.params.id, {
      include: [
        { model: Room },
        { model: Tenant, include: [{ model: User, as: 'user' }] }
      ]
    });
    
    if (!request) return res.status(404).json({ message: 'Request not found' });
    
    let adminImageUrl = null;
    if (req.file) {
      adminImageUrl = `/uploads/maintenance/${req.file.filename}`;
      const currentImages = request.images || [];
      request.images = [...currentImages, { type: 'admin', url: adminImageUrl }];
    }
    
    let statusChanged = false;
    if (req.body.status && request.status !== req.body.status) {
      request.status = req.body.status;
      statusChanged = true;
    }
    
    await request.save();

    // Send LINE Notification
    if ((statusChanged || adminImageUrl) && request.Tenant?.user?.line_user_id) {
      const statusMap = {
        'pending': 'รอดำเนินการ',
        'in_progress': 'กำลังดำเนินการซ่อม',
        'completed': 'ซ่อมเสร็จสิ้น',
        'cancelled': 'ยกเลิก'
      };
      
      const messages = [];
      
      let textMsg = `🛠️ อัปเดตสถานะการแจ้งซ่อมห้อง ${request.Room?.room_number || '-'}\nสถานะปัจจุบัน: ${statusMap[request.status] || request.status}`;
      if (req.body.status === 'completed') textMsg += '\n\n✅ ทางเราได้ดำเนินการซ่อมแซมให้เรียบร้อยแล้ว ขอบคุณที่ใช้บริการครับ';
      
      messages.push({ type: 'text', text: textMsg });
      
      if (adminImageUrl) {
        const appUrl = process.env.APP_URL || 'https://samruay-backend.onrender.com';
        const fullImageUrl = `${appUrl}${adminImageUrl}`;
        messages.push({
          type: 'image',
          originalContentUrl: fullImageUrl,
          previewImageUrl: fullImageUrl
        });
      }
      
      try {
        const dynamicClient = await getLineClient(request.Room?.property_id);
        await dynamicClient.pushMessage({
          to: request.Tenant.user.line_user_id,
          messages
        });
      } catch (err) {
        console.error('Failed to send LINE notification for maintenance:', err);
      }
    }
    
    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
