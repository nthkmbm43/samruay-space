const { sequelize, User, Property, Floor, RoomType, Room, Tenant, Contract, Setting } = require('./src/models');
const bcrypt = require('bcryptjs');

async function seedRealData() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    
    console.log('Clearing old data...');
    await sequelize.sync({ force: true }); // This drops all tables and recreates them!
    
    console.log('Seeding settings...');
    await Setting.bulkCreate([
      { key: 'water_rate', value: '20', value_type: 'number', description: 'ค่าน้ำ (บาท/หน่วย)' },
      { key: 'elec_rate', value: '6', value_type: 'number', description: 'ค่าไฟ (บาท/หน่วย)' }
    ]);
    
    console.log('Seeding super admin...');
    const password_hash = await bcrypt.hash('password123', 10);
    const admin = await User.create({
      first_name: 'Admin',
      last_name: 'SAMRUAY',
      email: 'admin@samruay.com',
      password_hash,
      role: 'super_admin'
    });

    console.log('Seeding property...');
    const property = await Property.create({
      owner_id: admin.id,
      name: 'หอพักสำรวย',
      address: '123 ถนนตัวอย่าง ตำบลตัวอย่าง อำเภอตัวอย่าง',
      phone: '0812345678',
      is_active: true
    });

    console.log('Seeding floor...');
    const floor = await Floor.create({
      property_id: property.id,
      floor_number: 1,
      name: 'ชั้น 1',
    });

    console.log('Seeding room type...');
    const roomType = await RoomType.create({
      property_id: property.id,
      name: 'ห้องมาตรฐาน (Standard)',
      base_price: 1500,
    });

    console.log('Seeding rooms...');
    const room1 = await Room.create({ property_id: property.id, floor_id: floor.id, room_type_id: roomType.id, room_number: '1', status: 'available', base_price: 1500 });
    const room2 = await Room.create({ property_id: property.id, floor_id: floor.id, room_type_id: roomType.id, room_number: '2', status: 'occupied', base_price: 1500 });
    const room3 = await Room.create({ property_id: property.id, floor_id: floor.id, room_type_id: roomType.id, room_number: '3', status: 'available', base_price: 1500 });
    const room4 = await Room.create({ property_id: property.id, floor_id: floor.id, room_type_id: roomType.id, room_number: '4', status: 'occupied', base_price: 1500 });

    console.log('Seeding tenants...');
    // Nuch in Room 2
    const nuchUser = await User.create({
      first_name: 'นุช',
      last_name: '-',
      email: 'nuch@example.com',
      password_hash: await bcrypt.hash('123456', 10),
      role: 'tenant'
    });
    const nuchTenant = await Tenant.create({
      user_id: nuchUser.id,
      room_id: room2.id,
      emergency_contact_name: '-',
      emergency_contact_phone: '-'
    });
    await Contract.create({
      room_id: room2.id,
      tenant_id: nuchTenant.id,
      start_date: new Date(),
      monthly_price: 1500,
      status: 'active',
      created_by: admin.id
    });

    // Bow in Room 4
    const bowUser = await User.create({
      first_name: 'โบว์',
      last_name: '-',
      email: 'bow@example.com',
      password_hash: await bcrypt.hash('123456', 10),
      role: 'tenant'
    });
    const bowTenant = await Tenant.create({
      user_id: bowUser.id,
      room_id: room4.id,
      emergency_contact_name: '-',
      emergency_contact_phone: '-'
    });
    await Contract.create({
      room_id: room4.id,
      tenant_id: bowTenant.id,
      start_date: new Date(),
      monthly_price: 1500,
      status: 'active',
      created_by: admin.id
    });

    console.log('Database seeded successfully with real data!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
}

seedRealData();
