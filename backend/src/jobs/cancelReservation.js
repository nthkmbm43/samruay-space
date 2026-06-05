const cron = require('node-cron');
const { Op } = require('sequelize');
const { Room, Tenant, Invoice, User } = require('../models');
const { sendPushMessage } = require('../controllers/webhook.controller');

// Run every midnight: '0 0 * * *'
// For testing purposes, we can also run it more frequently if needed, but midnight is standard.
cron.schedule('0 0 * * *', async () => {
  console.log('Running Auto-Cancel Reservation Job...');
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Find all reserved rooms
    const reservedRooms = await Room.findAll({
      where: { status: 'reserved' }
    });

    for (const room of reservedRooms) {
      // Find the tenant associated with this reservation
      const tenant = await Tenant.findOne({
        where: { room_id: room.id },
        order: [['created_at', 'DESC']]
      });

      if (!tenant) continue;

      // If reservation was made more than 3 days ago
      if (new Date(tenant.created_at) < threeDaysAgo) {
        // Find the booking invoice
        const invoice = await Invoice.findOne({
          where: { tenant_id: tenant.id }
        });

        // If invoice is still pending (no slip uploaded), CANCEL IT
        if (invoice && invoice.status === 'pending') {
          console.log(`Canceling reservation for room ${room.room_number}...`);
          
          // Delete invoice and tenant to clean up
          await invoice.destroy();
          await tenant.destroy();

          // Reset room status
          room.status = 'available';
          await room.save();

          // Notify user
          const user = await User.findByPk(tenant.user_id);
          if (user && user.line_user_id) {
            await sendPushMessage(
              user.id, 
              `⚠️ แจ้งเตือน:\nการจองห้อง ${room.room_number} ของคุณถูกยกเลิกอัตโนมัติ เนื่องจากระบบไม่พบการแจ้งชำระเงินมัดจำภายใน 3 วันครับ\nหากต้องการจองใหม่ สามารถพิมพ์ "ลงทะเบียนใหม่" ได้เลยครับ`
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in cancelReservation job:', error);
  }
});
