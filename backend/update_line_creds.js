const { Property } = require('./src/models');
const sequelize = require('./src/config/database');
require('dotenv').config({ path: '../.env' });

async function updateLineCredentials() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');

    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    
    console.log('LINE_CHANNEL_SECRET from .env:', channelSecret ? `${channelSecret.substring(0, 8)}...` : 'NOT SET');
    console.log('LINE_CHANNEL_ACCESS_TOKEN from .env:', channelAccessToken ? `${channelAccessToken.substring(0, 20)}...` : 'NOT SET');

    if (!channelSecret) {
      console.log('\n⚠️  LINE_CHANNEL_SECRET is not set in .env');
      console.log('   The webhook will still work using .env fallback, but you should set it in the Property table via the admin UI.');
    }

    // Update property ID 1 with the credentials from .env
    const property = await Property.findByPk(1);
    if (property) {
      if (channelSecret) {
        property.line_channel_secret = channelSecret;
      }
      if (channelAccessToken) {
        property.line_channel_access_token = channelAccessToken;
      }
      await property.save();
      console.log('\n✅ Property "' + property.name + '" updated with LINE credentials from .env');
    } else {
      console.log('\n❌ Property ID 1 not found');
    }

    // Verify
    const updated = await Property.findByPk(1);
    console.log('\nVerification:');
    console.log('  Secret:', updated.line_channel_secret ? '✅ SET' : '❌ NULL');
    console.log('  Token:', updated.line_channel_access_token ? '✅ SET' : '❌ NULL');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sequelize.close();
  }
}

updateLineCredentials();
