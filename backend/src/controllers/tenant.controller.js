const { Tenant, User, Room } = require('../models');

exports.getAllTenants = async (req, res) => {
  try {
    const tenants = await Tenant.findAll({
      include: [
        { model: User, as: 'user', attributes: ['id', 'email', 'first_name', 'last_name', 'phone'] },
        { model: Room, as: 'room', attributes: ['id', 'room_number'] }
      ]
    });
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createTenant = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, room_id, id_card_number } = req.body;
    
    // Create user first
    const user = await User.create({
      first_name, last_name, email, phone, password_hash: '123456', role: 'tenant'
    });

    const tenant = await Tenant.create({
      user_id: user.id,
      room_id,
      id_card_number,
      emergency_contact_name: '-',
      emergency_contact_phone: '-'
    });

    // Update room status
    if (room_id) {
      await Room.update({ status: 'occupied' }, { where: { id: room_id } });
    }

    res.status(201).json(tenant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findByPk(req.params.id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const { first_name, last_name, email, phone, room_id, status } = req.body;

    // Update associated user
    if (tenant.user) {
      await tenant.user.update({ first_name, last_name, email, phone });
    }

    if (status !== undefined) {
      await tenant.update({ status });
    }

    // Handle room change
    if (room_id !== undefined && room_id !== tenant.room_id) {
      // Free old room
      if (tenant.room_id) {
        await Room.update({ status: 'available' }, { where: { id: tenant.room_id } });
      }
      // Occupy new room
      if (room_id) {
        await Room.update({ status: 'occupied' }, { where: { id: room_id } });
      }
      await tenant.update({ room_id });
    }

    res.json(tenant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findByPk(req.params.id);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    
    if (tenant.room_id) {
      await Room.update({ status: 'available' }, { where: { id: tenant.room_id } });
    }
    
    await tenant.destroy();
    res.json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
