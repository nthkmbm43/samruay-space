const { Property } = require('./src/models');
const sequelize = require('./src/config/database');

async function check() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');
    const properties = await Property.findAll();
    console.log('Properties count:', properties.length);
    properties.forEach(p => {
      console.log(`ID: ${p.id}, Name: ${p.name}`);
      console.log(`  Token exists: ${!!p.line_channel_access_token}`);
      console.log(`  Secret exists: ${!!p.line_channel_secret}`);
      console.log(`  Token: ${p.line_channel_access_token}`);
      console.log(`  Secret: ${p.line_channel_secret}`);
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sequelize.close();
  }
}

check();
