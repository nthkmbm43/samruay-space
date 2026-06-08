const { Room, RoomType, Floor, Tenant } = require('../models');
const { Op } = require('sequelize');

// ─── Helper: Lazy Evaluation — apply pending price ถ้าถึงกำหนดแล้ว ───────────
async function applyPendingPricesIfDue(rooms) {
  const now = new Date();
  const roomsToUpdate = rooms.filter(
    (r) =>
      r.price_effective_date &&
      new Date(r.price_effective_date) <= now &&
      (r.pending_price_override !== null || r.pending_price_per_day !== null)
  );

  if (roomsToUpdate.length === 0) return rooms;

  await Promise.all(
    roomsToUpdate.map(async (r) => {
      const updates = {
        price_effective_date: null,
      };
      if (r.pending_price_override !== null) {
        updates.price_override = r.pending_price_override;
        updates.pending_price_override = null;
      }
      if (r.pending_price_per_day !== null) {
        updates.price_per_day = r.pending_price_per_day;
        updates.pending_price_per_day = null;
      }
      await r.update(updates);
    })
  );

  // Return fresh data after update
  return rooms.map((r) => {
    const updated = roomsToUpdate.find((u) => u.id === r.id);
    return updated || r;
  });
}

// ─── GET ALL ─────────────────────────────────────────────────────────────────
exports.getAllRooms = async (req, res) => {
  try {
    const { property_id, status } = req.query;

    const whereClause = {};
    if (property_id) whereClause.property_id = property_id;
    if (status) whereClause.status = status;

    let rooms = await Room.findAll({
      where: whereClause,
      include: [
        { model: RoomType },
        { model: Floor }
      ]
    });

    // Lazy Evaluation: apply pending prices ที่ถึงกำหนด
    rooms = await applyPendingPricesIfDue(rooms);

    res.json(rooms);
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET BY ID ────────────────────────────────────────────────────────────────
exports.getRoomById = async (req, res) => {
  try {
    let room = await Room.findByPk(req.params.id, {
      include: [
        { model: RoomType },
        { model: Floor }
      ]
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Lazy eval สำหรับห้องเดี่ยว
    const [updated] = await applyPendingPricesIfDue([room]);
    room = updated;

    res.json(room);
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── CREATE ───────────────────────────────────────────────────────────────────
exports.createRoom = async (req, res) => {
  try {
    // Destructure ทุก field ที่ต้องการ explicit
    const {
      room_number,
      room_type,
      base_price,
      floor_number,
      property_id,
      price_override,
      rental_type,
      price_per_day,
      status,
      description,
      images,
    } = req.body;

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

    // คำนวณ price_per_day จริงๆ — ป้องกัน 0 บาท
    const resolvedPricePerDay =
      rental_type !== 'monthly' && price_per_day != null && Number(price_per_day) > 0
        ? Number(price_per_day)
        : null;

    const resolvedPriceOverride =
      price_override != null && Number(price_override) > 0
        ? Number(price_override)
        : base_price
        ? Number(base_price)
        : null;

    const newRoom = await Room.create({
      room_number,
      property_id: Number(property_id),
      floor_id,
      room_type_id,
      rental_type: rental_type || 'both',
      price_override: resolvedPriceOverride,
      price_per_day: resolvedPricePerDay,
      status: status || 'available',
      description: description || null,
      images: images || [],
      // ไม่มี pending fields ตอนสร้างใหม่
      pending_price_override: null,
      pending_price_per_day: null,
      price_effective_date: null,
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

// ─── UPDATE ───────────────────────────────────────────────────────────────────
exports.updateRoom = async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const {
      room_number,
      status,
      floor_number,
      room_type,
      rental_type,
      price_override,
      price_per_day,
      tenant_id,
      description,
      images,
      effective_immediately, // boolean จาก Frontend
    } = req.body;

    const updateData = {};

    // ── ข้อมูลทั่วไป ─────────────────────────────────────
    if (room_number !== undefined) updateData.room_number = room_number;
    if (description !== undefined) updateData.description = description;
    if (images !== undefined) updateData.images = images;

    if (rental_type !== undefined) updateData.rental_type = rental_type;

    // ── Floor ──────────────────────────────────────────────
    if (floor_number !== undefined) {
      const [floor] = await Floor.findOrCreate({
        where: { property_id: room.property_id, floor_number },
        defaults: { name: `ชั้น ${floor_number}` }
      });
      updateData.floor_id = floor.id;
    }

    // ── Room Type ─────────────────────────────────────────
    if (room_type !== undefined) {
      const [rType] = await RoomType.findOrCreate({
        where: { property_id: room.property_id, name: room_type },
        defaults: { base_price: price_override || room.price_override || 0 }
      });
      updateData.room_type_id = rType.id;
    }

    // ── Temporal Price Logic ──────────────────────────────
    const newPriceOverride =
      price_override != null && Number(price_override) >= 0
        ? Number(price_override)
        : undefined;
    const newPricePerDay =
      price_per_day != null && Number(price_per_day) >= 0
        ? Number(price_per_day)
        : undefined;

    const hasPriceChange =
      (newPriceOverride !== undefined && newPriceOverride !== parseFloat(room.price_override)) ||
      (newPricePerDay !== undefined && newPricePerDay !== parseFloat(room.price_per_day));

    if (hasPriceChange) {
      if (effective_immediately === true || effective_immediately === 'true') {
        // ── ใช้ทันที: อัปเดตราคาจริง + เคลียร์ pending ──
        if (newPriceOverride !== undefined) updateData.price_override = newPriceOverride;
        if (newPricePerDay !== undefined) updateData.price_per_day = newPricePerDay;
        updateData.pending_price_override = null;
        updateData.pending_price_per_day = null;
        updateData.price_effective_date = null;
      } else {
        // ── มีผลพรุ่งนี้: เก็บใน pending ─────────────────
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0); // เที่ยงคืนพรุ่งนี้

        if (newPriceOverride !== undefined) updateData.pending_price_override = newPriceOverride;
        else updateData.pending_price_override = null;

        if (newPricePerDay !== undefined) updateData.pending_price_per_day = newPricePerDay;
        else updateData.pending_price_per_day = null;

        updateData.price_effective_date = tomorrow;
        // ราคาปัจจุบันไม่เปลี่ยน
      }
    } else if (newPriceOverride !== undefined || newPricePerDay !== undefined) {
      // ราคาเหมือนเดิม — ไม่ต้องทำอะไร แต่อัปเดตถ้ามีการส่งมา
      if (newPriceOverride !== undefined) updateData.price_override = newPriceOverride;
      if (newPricePerDay !== undefined) updateData.price_per_day = newPricePerDay;
    }

    // ── Status & Tenant ───────────────────────────────────
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'occupied' && tenant_id) {
        await Tenant.update(
          { room_id: room.id, status: 'active' },
          { where: { id: tenant_id } }
        );
      } else if (status && status !== 'occupied') {
        await Tenant.update(
          { room_id: null, status: 'inactive' },
          { where: { room_id: room.id } }
        );
      }
    }

    await room.update(updateData);
    res.json(room);
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────
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
