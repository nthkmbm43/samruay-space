const { Invoice, Payment, Room, Contract, MeterReading, Tenant, Setting, MaintenanceRequest } = require('../models');
const { Op } = require('sequelize');

exports.getAllInvoices = async (req, res) => {
  try {
    const { property_id, status, period_month, period_year } = req.query;
    
    const whereClause = {};
    if (property_id) whereClause.property_id = property_id;
    if (status) whereClause.status = status;
    if (period_month) whereClause.period_month = period_month;
    if (period_year) whereClause.period_year = period_year;
    
    const invoices = await Invoice.findAll({
      where: whereClause,
      include: [
        { model: Room, attributes: ['room_number'] },
        { model: Payment }
      ],
      order: [['created_at', 'DESC']]
    });
    
    res.json(invoices);
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        { model: Room },
        { model: Payment }
      ]
    });
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    res.json(invoice);
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.previewInvoices = async (req, res) => {
  try {
    const { property_id, period_month, period_year } = req.body;
    
    // Find active tenants for the property
    const activeTenants = await Tenant.findAll({
      include: [
        { model: Room, as: 'room', where: { property_id } }
      ],
      where: { status: 'active' }
    });

    const previews = [];

    for (const tenant of activeTenants) {
      // Find meter reading
      const reading = await MeterReading.findOne({
        where: { room_id: tenant.room_id, period_month, period_year }
      });

      // Find pending maintenance costs for this room in this month
      // Start and end of period
      const startDate = new Date(period_year, period_month - 1, 1);
      const endDate = new Date(period_year, period_month, 0, 23, 59, 59);

      const maintenances = await MaintenanceRequest.findAll({
        where: {
          room_id: tenant.room_id,
          status: 'completed',
          cost: { [Op.gt]: 0 },
          completed_at: { [Op.between]: [startDate, endDate] }
        }
      });

      // Check if invoice already exists
      const existingInvoice = await Invoice.findOne({
        where: { tenant_id: tenant.id, period_month, period_year }
      });

      previews.push({
        tenant_id: tenant.id,
        room_id: tenant.room_id,
        room_number: tenant.room.room_number,
        room_price: Number(tenant.room.price_override || tenant.room.price || 0),
        meter_reading: reading,
        has_reading: !!reading,
        maintenances,
        already_generated: !!existingInvoice
      });
    }

    res.json(previews);
  } catch (error) {
    console.error('Preview invoices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.generateInvoices = async (req, res) => {
  try {
    const { property_id, period_month, period_year, due_date, invoices } = req.body;
    
    if (!invoices || !Array.isArray(invoices)) {
      return res.status(400).json({ message: 'No invoice data provided' });
    }

    const generatedInvoices = [];

    const waterRateSetting = await Setting.findOne({ where: { key: 'water_rate' } });
    const electricRateSetting = await Setting.findOne({ where: { key: 'elec_rate' } });
    const water_rate = waterRateSetting ? parseFloat(waterRateSetting.value) : 0; 
    const elec_rate = electricRateSetting ? parseFloat(electricRateSetting.value) : 0;

    for (const invData of invoices) {
      // Find meter reading for this period
      const reading = await MeterReading.findOne({
        where: { room_id: invData.room_id, period_month, period_year }
      });

      if (!reading) {
        // Skip generating invoice if no reading
        continue;
      }

      const water_units = reading.water_units || 0;
      const elec_units = reading.elec_units || 0;
      const water_amount = water_units * water_rate;
      const elec_amount = elec_units * elec_rate;

      let other_charges = [];
      let extra_cost_total = 0;

      // Add selected maintenances
      if (invData.maintenances && Array.isArray(invData.maintenances)) {
        for (const m of invData.maintenances) {
          other_charges.push({ title: m.title, amount: Number(m.cost) });
          extra_cost_total += Number(m.cost);
        }
      }

      // Add manual costs
      if (invData.manual_costs && Array.isArray(invData.manual_costs)) {
        for (const mc of invData.manual_costs) {
          other_charges.push({ title: mc.title, amount: Number(mc.cost) });
          extra_cost_total += Number(mc.cost);
        }
      }

      const room_price = Number(invData.room_price || 0);
      const subtotal = room_price + water_amount + elec_amount + extra_cost_total;
      const total = subtotal; // Ignoring VAT for now

      // Check if invoice already exists
      const existingInvoice = await Invoice.findOne({
        where: { tenant_id: invData.tenant_id, period_month, period_year }
      });

      if (!existingInvoice) {
        const invoice = await Invoice.create({
          invoice_number: `INV-${period_year}${period_month.toString().padStart(2, '0')}-${invData.room_id}`,
          property_id,
          room_id: invData.room_id,
          tenant_id: invData.tenant_id,
          period_month,
          period_year,
          due_date: due_date || new Date(period_year, period_month, 5),
          room_price,
          water_units,
          water_rate,
          water_amount,
          elec_units,
          elec_rate,
          elec_amount,
          other_charges,
          subtotal,
          total,
          status: 'pending',
          created_by: req.user.id
        });
        generatedInvoices.push(invoice);
      }
    }
    
    res.status(201).json({
      message: `Generated ${generatedInvoices.length} invoices`,
      invoices: generatedInvoices
    });
  } catch (error) {
    console.error('Generate invoices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.recordPayment = async (req, res) => {
  try {
    const { id } = req.params; // Invoice ID
    const { amount, method, reference_number, slip_image } = req.body;
    
    const invoice = await Invoice.findByPk(id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const payment = await Payment.create({
      invoice_id: id,
      amount,
      method,
      reference_number,
      slip_image,
      received_by: req.user.id,
      status: 'confirmed'
    });

    // Update invoice status
    invoice.paid_amount = Number(invoice.paid_amount || 0) + Number(amount);
    if (invoice.paid_amount >= invoice.total) {
      invoice.status = 'paid';
      invoice.paid_at = new Date();
    } else {
      invoice.status = 'partial';
    }
    await invoice.save();
    
    res.status(201).json({ message: 'Payment recorded', payment, invoice });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.verifyInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paid_amount, reason } = req.body;
    
    const invoice = await Invoice.findByPk(id, {
      include: [
        { model: Room },
        { model: require('../models').Tenant, include: [{ model: require('../models').User, as: 'user' }] }
      ]
    });

    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const { sendPushMessage } = require('./webhook.controller');
    const userId = invoice.Tenant?.user?.id;

    if (status === 'paid') {
      invoice.status = 'paid';
      invoice.paid_amount = invoice.total;
      invoice.paid_at = new Date();
      
      if (invoice.Room && invoice.Room.status === 'reserved') {
        await invoice.Room.update({ status: 'occupied' });
      }

      if (userId) {
        await sendPushMessage(userId, '✅ ได้รับยอดเงินเรียบร้อย เข้าอยู่ได้เลยครับ!');
      }
    } else if (status === 'partial') {
      invoice.status = 'partial';
      invoice.paid_amount = Number(paid_amount) || 0;
      
      const missingAmount = Number(invoice.total) - invoice.paid_amount;
      if (userId) {
        await sendPushMessage(userId, `⚠️ ยอดเงินขาดอีก ${missingAmount} บาท\nเหตุผล: ${reason || 'โอนไม่ครบ'}\n\nกรุณาแนบสลิปยอดที่เหลือส่งกลับมาในแชทนี้ได้เลยครับ`);
      }
    } else if (status === 'pending') {
      invoice.status = 'pending'; // Reset back to pending so they can re-upload
      if (userId) {
        await sendPushMessage(userId, `❌ สลิปไม่ถูกต้อง\nเหตุผล: ${reason || 'ข้อมูลในสลิปไม่ชัดเจน'}\n\nกรุณาแนบรูปสลิปใหม่ส่งกลับมาในแชทนี้ได้เลยครับ`);
      }
    }

    await invoice.save();
    res.json({ message: 'Invoice verified successfully', invoice });
  } catch (error) {
    console.error('Verify invoice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.recordMeters = async (req, res) => {
  try {
    const { period_month, period_year, readings } = req.body;
    const { MeterReading, Room } = require('../models');

    for (const r of readings) {
      if (r.water_current !== undefined || r.elec_current !== undefined || r.water_previous !== undefined || r.elec_previous !== undefined) {
        // Ensure values are numbers or null
        const water_current = (r.water_current !== null && r.water_current !== '') ? Number(r.water_current) : null;
        const water_previous = (r.water_previous !== null && r.water_previous !== '') ? Number(r.water_previous) : 0;
        const elec_current = (r.elec_current !== null && r.elec_current !== '') ? Number(r.elec_current) : null;
        const elec_previous = (r.elec_previous !== null && r.elec_previous !== '') ? Number(r.elec_previous) : 0;

        const water_units = (water_current !== null && water_current >= water_previous) 
          ? (water_current - water_previous) 
          : 0;

        const elec_units = (elec_current !== null && elec_current >= elec_previous) 
          ? (elec_current - elec_previous) 
          : 0;

        // Propagate previous meter changes to the prior month's reading or the Room model
        const prevDate = new Date(period_year, period_month - 2, 1);
        const prevMonth = prevDate.getMonth() + 1;
        const prevYear = prevDate.getFullYear();

        const prevReading = await MeterReading.findOne({
          where: { room_id: r.room_id, period_month: prevMonth, period_year: prevYear }
        });

        if (prevReading) {
          prevReading.water_current = water_previous;
          prevReading.elec_current = elec_previous;
          prevReading.water_units = (prevReading.water_current !== null && prevReading.water_current >= prevReading.water_previous)
            ? (prevReading.water_current - prevReading.water_previous)
            : 0;
          prevReading.elec_units = (prevReading.elec_current !== null && prevReading.elec_current >= prevReading.elec_previous)
            ? (prevReading.elec_current - prevReading.elec_previous)
            : 0;
          await prevReading.save();
        } else {
          const room = await Room.findByPk(r.room_id);
          if (room) {
            room.water_meter_start = water_previous;
            room.elec_meter_start = elec_previous;
            await room.save();
          }
        }

        const existing = await MeterReading.findOne({
          where: { room_id: r.room_id, period_month, period_year }
        });

        if (existing) {
          existing.water_previous = water_previous;
          existing.water_current = water_current;
          existing.water_units = water_units;
          existing.elec_previous = elec_previous;
          existing.elec_current = elec_current;
          existing.elec_units = elec_units;
          existing.reading_date = new Date();
          await existing.save();
        } else {
          await MeterReading.create({
            room_id: r.room_id,
            period_month,
            period_year,
            reading_date: new Date(),
            water_previous,
            water_current,
            water_units,
            elec_previous,
            elec_current,
            elec_units,
            recorded_by: req.user.id
          });
        }
      }
    }

    res.status(201).json({ message: 'Meters recorded successfully' });
  } catch (error) {
    console.error('Record meters error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMeters = async (req, res) => {
  try {
    const property_id = req.query.property_id;
    if (!property_id) {
      return res.status(400).json({ message: 'Property ID is required' });
    }

    const { MeterReading, Room } = require('../models');
    const readings = await MeterReading.findAll({
      include: [
        { 
          model: Room, 
          attributes: ['room_number'],
          where: { property_id } 
        }
      ],
      order: [['period_year', 'DESC'], ['period_month', 'DESC']]
    });
    res.json(readings);
  } catch (error) {
    console.error('Get meters error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMeterReadingsForPeriod = async (req, res) => {
  try {
    const property_id = req.query.property_id;
    if (!property_id) {
      return res.status(400).json({ message: 'Property ID is required' });
    }

    const period_month = parseInt(req.query.month);
    const period_year = parseInt(req.query.year);
    if (!period_month || !period_year) {
      return res.status(400).json({ message: 'Month and year are required' });
    }

    const { MeterReading, Room } = require('../models');

    // Calculate previous month/year
    const prevDate = new Date(period_year, period_month - 2, 1);
    const prevMonth = prevDate.getMonth() + 1;
    const prevYear = prevDate.getFullYear();

    // Get all rooms for this property
    const rooms = await Room.findAll({
      where: { property_id },
      order: [['room_number', 'ASC']]
    });

    const readingsForPeriod = [];

    for (const room of rooms) {
      // Find current reading (if any exists)
      const currentReading = await MeterReading.findOne({
        where: { room_id: room.id, period_month, period_year }
      });

      // Find previous reading (from prevMonth/prevYear)
      const prevReading = await MeterReading.findOne({
        where: { room_id: room.id, period_month: prevMonth, period_year: prevYear }
      });

      const water_previous = prevReading ? prevReading.water_current : room.water_meter_start;
      const elec_previous = prevReading ? prevReading.elec_current : room.elec_meter_start;

      readingsForPeriod.push({
        room_id: room.id,
        room_number: room.room_number,
        status: room.status,
        water_previous: Number(water_previous || 0),
        water_current: currentReading ? Number(currentReading.water_current) : null,
        water_units: currentReading ? Number(currentReading.water_units) : null,
        elec_previous: Number(elec_previous || 0),
        elec_current: currentReading ? Number(currentReading.elec_current) : null,
        elec_units: currentReading ? Number(currentReading.elec_units) : null
      });
    }

    res.json(readingsForPeriod);
  } catch (error) {
    console.error('Get meter readings for period error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
