const { Room, RoomType, Floor } = require('../models');

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
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id);
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    await room.update(req.body);
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
