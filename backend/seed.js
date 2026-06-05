const { User } = require('./src/models');
const sequelize = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    await sequelize.authenticate();
    
    const existingAdmin = await User.findOne({ where: { email: 'admin@samruay.com' } });
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash('123456', salt);
      
      await User.create({
        email: 'admin@samruay.com',
        first_name: 'Admin',
        last_name: 'User',
        password_hash,
        role: 'super_admin'
      });
      console.log('Admin user created: admin@samruay.com / 123456');
    } else {
      console.log('Admin user already exists');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
