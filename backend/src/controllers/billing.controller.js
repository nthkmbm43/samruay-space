const { Invoice, Payment, Room, Contract, MeterReading, Tenant, Setting } = require('../models');
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

exports.generateInvoices = async (req, res) => {
  try {
    const { property_id, period_month, period_year, due_date } = req.body;
    
    // Find active tenants for the property
    const activeTenants = await Tenant.findAll({
      include: [
        { 
          model: Room, 
          as: 'room',
          where: { property_id } 
        }
      ]
    });

    const generatedInvoices = [];

    for (const tenant of activeTenants) {
      // Find meter reading for this period
      const reading = await MeterReading.findOne({
        where: {
          room_id: tenant.room_id,
          period_month,
          period_year
        }
      });

      const waterRateSetting = await Setting.findOne({ where: { key: 'WATER_RATE' } });
      const electricRateSetting = await Setting.findOne({ where: { key: 'ELECTRIC_RATE' } });
      
      const water_rate = waterRateSetting ? parseFloat(waterRateSetting.value) : 18; 
      const elec_rate = electricRateSetting ? parseFloat(electricRateSetting.value) : 8;
      let water_amount = 0;
      let elec_amount = 0;
      let water_units = 0;
      let elec_units = 0;

      if (reading) {
        water_units = reading.water_units || 0;
        elec_units = reading.elec_units || 0;
        water_amount = water_units * water_rate;
        elec_amount = elec_units * elec_rate;
      }

      const room_price = Number(tenant.room.price || tenant.room.price_override || 0);
      const subtotal = room_price + water_amount + elec_amount;
      const total = subtotal; // Ignoring VAT and discounts for this simple MVP

      // Check if invoice already exists
      const existingInvoice = await Invoice.findOne({
        where: {
          tenant_id: tenant.id,
          period_month,
          period_year
        }
      });

      if (!existingInvoice) {
        const invoice = await Invoice.create({
          invoice_number: `INV-${period_year}${period_month.toString().padStart(2, '0')}-${tenant.room_id}`,
          property_id,
          room_id: tenant.room_id,
          tenant_id: tenant.id,
          period_month,
          period_year,
          due_date: due_date || new Date(period_year, period_month, 5), // Default to 5th of next month
          room_price,
          water_units,
          water_rate,
          water_amount,
          elec_units,
          elec_rate,
          elec_amount,
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
    const { MeterReading } = require('../models');

    for (const r of readings) {
      if (r.water_units !== undefined || r.elec_units !== undefined) {
        const existing = await MeterReading.findOne({
          where: { room_id: r.room_id, period_month, period_year }
        });

        if (existing) {
          existing.water_units = r.water_units ?? existing.water_units;
          existing.elec_units = r.elec_units ?? existing.elec_units;
          await existing.save();
        } else {
          await MeterReading.create({
            room_id: r.room_id,
            period_month,
            period_year,
            reading_date: new Date(),
            water_units: r.water_units,
            elec_units: r.elec_units,
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
    const { MeterReading, Room } = require('../models');
    const readings = await MeterReading.findAll({
      include: [{ model: Room, attributes: ['room_number'] }],
      order: [['period_year', 'DESC'], ['period_month', 'DESC']]
    });
    res.json(readings);
  } catch (error) {
    console.error('Get meters error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
