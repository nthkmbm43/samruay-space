const { MaintenanceRequest, Room, Tenant, User } = require('../models');

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

exports.updateRequestStatus = async (req, res) => {
  try {
    const request = await MaintenanceRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    
    if (req.body.status) {
      request.status = req.body.status;
    }
    
    await request.save();
    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
