const { Invoice, Payment, Room, Contract, MeterReading } = require('../models');
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
        { model: Room, attributes: ['room_number'] }
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
    
    // Find active contracts for the property
    const activeContracts = await Contract.findAll({
      where: { status: 'active' },
      include: [
        { 
          model: Room, 
          where: { property_id } 
        }
      ]
    });

    const generatedInvoices = [];

    for (const contract of activeContracts) {
      // Find meter reading for this period
      const reading = await MeterReading.findOne({
        where: {
          room_id: contract.room_id,
          period_month,
          period_year
        }
      });

      // Default rates if not set in settings (in a real app, fetch from Setting model)
      const water_rate = 18; 
      const elec_rate = 8;
      
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

      const room_price = Number(contract.monthly_price);
      const subtotal = room_price + water_amount + elec_amount;
      const total = subtotal; // Ignoring VAT and discounts for this simple MVP

      // Check if invoice already exists
      const existingInvoice = await Invoice.findOne({
        where: {
          contract_id: contract.id,
          period_month,
          period_year
        }
      });

      if (!existingInvoice) {
        const invoice = await Invoice.create({
          invoice_number: `INV-${period_year}${period_month.toString().padStart(2, '0')}-${contract.room_id}`,
          property_id,
          room_id: contract.room_id,
          tenant_id: contract.tenant_id,
          contract_id: contract.id,
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
