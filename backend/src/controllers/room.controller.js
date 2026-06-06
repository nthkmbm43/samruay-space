const { Room, RoomType, Floor, Tenant } = require('../models');

exports.getAllRooms = async (req, res) => {
  try {
    const { property_id, status } = req.query;
    
    const whereClause = {};
    if (property_id) whereClause.property_id = property_id;
    if (status) whereClause.status = status;
    
    const rooms = await Room.findAll({
      where: whereClause,
      include: [
        { model: RoomType },
        { model: Floor }
      ]
    });
    
    res.json(rooms);
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getRoomById = async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id, {
      include: [
        { model: RoomType },
        { model: Floor }
      ]
    });
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    res.json(room);
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createRoom = async (req, res) => {
  try {
    const { room_number, room_type, base_price, floor_number, property_id, price_override } = req.body;
    
    let floor_id = null;
    let room_type_id = null;

    if (property_id && floor_number) {
      const [floor] = await Floor.findOrCreate({
        where: { property_id, floor_number },
        defaults: { name: `ชั้น ${floor_number}` }
      });
      floor_id = floor.id;
    }

    if (property_id && room_type) {
      const [rType] = await RoomType.findOrCreate({
        where: { property_id, name: room_type },
        defaults: { base_price: base_price || 0 }
      });
      room_type_id = rType.id;
    }

    const newRoom = await Room.create({
      room_number,
      property_id,
      floor_id,
      room_type_id,
      price_override: price_override || base_price || 0,
      ...req.body
    });

    res.status(201).json(newRoom);
  } catch (error) {
    console.error('Create room error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'รหัสห้องนี้มีอยู่ในระบบแล้ว กรุณาใช้หมายเลขอื่น' });
    }
    res.status(500).json({ message: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง' });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id);
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const updateData = { ...req.body };
    
    if (updateData.floor_number !== undefined) {
      const [floor] = await Floor.findOrCreate({
        where: { property_id: room.property_id, floor_number: updateData.floor_number },
        defaults: { name: `ชั้น ${updateData.floor_number}` }
      });
      updateData.floor_id = floor.id;
    }

    if (updateData.room_type !== undefined) {
      const [rType] = await RoomType.findOrCreate({
        where: { property_id: room.property_id, name: updateData.room_type },
        defaults: { base_price: updateData.price_override || room.price_override || 0 }
      });
      updateData.room_type_id = rType.id;
    }
    
    // Handle tenant assignment
    if (updateData.status === 'occupied' && updateData.tenant_id) {
      // Unlink the chosen tenant from any old room, and link to this room
      await Tenant.update({ room_id: room.id, status: 'active' }, { where: { id: updateData.tenant_id } });
    } else if (updateData.status && updateData.status !== 'occupied') {
      // Unlink any tenant from this room if it's no longer occupied
      await Tenant.update({ room_id: null, status: 'inactive' }, { where: { room_id: room.id } });
    }

    await room.update(updateData);
    res.json(room);
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id);
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    await room.destroy();
    res.json({ message: 'Room deleted' });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
