const { sequelize, User, Property, Room, Tenant, Contract, Invoice, Payment } = require('../src/models');
const { Op } = require('sequelize');

async function seedReportData() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();

    // 1. Find the property, rooms, tenants, contracts
    const property = await Property.findOne({ where: { name: 'หอพักสำรวย' } });
    if (!property) {
      console.error('Property not found! Please seed real data first.');
      process.exit(1);
    }
    const propertyId = property.id;

    // Retrieve Admin User to set as creator
    const admin = await User.findOne({ where: { role: 'super_admin' } });
    const adminId = admin ? admin.id : 1;

    console.log(`Found Property: ${property.name} (ID: ${propertyId})`);

    const rooms = await Room.findAll({ where: { property_id: propertyId } });
    const occupiedRooms = rooms.filter(r => r.status === 'occupied');
    console.log(`Found ${rooms.length} total rooms, ${occupiedRooms.length} occupied rooms.`);

    const tenants = await Tenant.findAll({
      include: [{ model: Room, as: 'room', where: { property_id: propertyId } }]
    });
    console.log(`Found ${tenants.length} tenants in this property.`);

    // 2. Adjust or create contracts to start 6 months ago
    const now = new Date();
    // 6 months ago date
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    // Delete existing contracts for these tenants so we can recreate them clean
    const tenantIds = tenants.map(t => t.id);
    await Contract.destroy({ where: { tenant_id: { [Op.in]: tenantIds } } });

    console.log('Creating backdated contracts starting 6 months ago...');
    const contracts = [];
    for (const tenant of tenants) {
      const contract = await Contract.create({
        room_id: tenant.room_id,
        tenant_id: tenant.id,
        start_date: sixMonthsAgo.toISOString().split('T')[0],
        monthly_price: 1500,
        status: 'active',
        created_by: adminId
      });
      contracts.push(contract);
    }
    console.log(`Created ${contracts.length} backdated contracts.`);

    // 3. Clear existing invoices and payments for these rooms to avoid duplicates
    const roomIds = rooms.map(r => r.id);
    const existingInvoices = await Invoice.findAll({ where: { room_id: { [Op.in]: roomIds } } });
    const existingInvoiceIds = existingInvoices.map(inv => inv.id);
    
    if (existingInvoiceIds.length > 0) {
      await Payment.destroy({ where: { invoice_id: { [Op.in]: existingInvoiceIds } } });
      await Invoice.destroy({ where: { id: { [Op.in]: existingInvoiceIds } } });
      console.log(`Cleared ${existingInvoiceIds.length} existing invoices and their payments.`);
    }

    // 4. Generate invoices and payments for each of the last 6 months
    console.log('Generating 6 months of historical invoices and payments...');
    
    // We will generate data for: M-5, M-4, M-3, M-2, M-1, and M (current month)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      
      console.log(`Generating for period: ${year}-${month}`);

      for (const tenant of tenants) {
        const room = rooms.find(r => r.id === tenant.room_id);
        const contract = contracts.find(c => c.tenant_id === tenant.id);
        
        // Setup invoice numbers like INV-YYYYMM-ROOM
        const monthStr = String(month).padStart(2, '0');
        const invoiceNumber = `INV-${year}${monthStr}-${room.room_number}`;
        
        // Define status
        let status = 'paid';
        // Let's make the current month's invoice (i = 0) pending
        // And let's make room 4's previous month's invoice (i = 1, May) pending/overdue to test overdue stats!
        if (i === 0) {
          status = 'pending';
        } else if (i === 1 && room.room_number === '4') {
          status = 'pending'; // Overdue invoice
        }

        const roomPrice = 1500;
        const waterAmount = 120;
        const elecAmount = 240;
        const subtotal = roomPrice + waterAmount + elecAmount;
        const total = subtotal; // no VAT or discount

        // Due date: 15th of that month
        const dueDate = `${year}-${monthStr}-15`;
        const issueDate = `${year}-${monthStr}-01`;

        const invoice = await Invoice.create({
          invoice_number: invoiceNumber,
          property_id: propertyId,
          room_id: room.id,
          tenant_id: tenant.id,
          contract_id: contract.id,
          period_month: month,
          period_year: year,
          issue_date: issueDate,
          due_date: dueDate,
          room_price: roomPrice,
          water_units: 6,
          water_rate: 20,
          water_amount: waterAmount,
          elec_units: 40,
          elec_rate: 6,
          elec_amount: elecAmount,
          subtotal,
          total,
          status,
          paid_amount: status === 'paid' ? total : 0,
          paid_at: status === 'paid' ? new Date(year, month - 1, 10, 10, 0, 0) : null,
          payment_method: status === 'paid' ? 'transfer' : null,
          generated_by: 'auto',
          created_by: adminId
        });

        if (status === 'paid') {
          await Payment.create({
            invoice_id: invoice.id,
            amount: total,
            method: 'transfer',
            payment_date: new Date(year, month - 1, 10, 10, 0, 0),
            status: 'confirmed',
            received_by: adminId
          });
        }
      }
    }

    console.log('Seeding report data finished successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding report data:', error);
    process.exit(1);
  }
}

seedReportData();
