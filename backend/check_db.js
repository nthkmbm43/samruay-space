const { MoveOutRequest, Room, Tenant, User } = require('./src/models');
const sequelize = require('./src/config/database');

async function check() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');
    const requests = await MoveOutRequest.findAll({
      include: [
        { model: Room, as: 'room' },
        { model: Tenant, as: 'tenant', include: [{ model: User, as: 'user' }] }
      ]
    });
    console.log('MoveOutRequests count:', requests.length);
    requests.forEach(r => {
      console.log(`ID: ${r.id}, Status: ${r.status}, Date: ${r.request_date}`);
      console.log(`  Room: ${r.room ? r.room.room_number : 'null'}`);
      console.log(`  Tenant: ${r.tenant ? (r.tenant.user ? r.tenant.user.first_name : 'no user') : 'null'}`);
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sequelize.close();
  }
}

check();
