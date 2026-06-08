const jwt = require('jsonwebtoken');
const { User, Tenant, Room, Invoice } = require('../models');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Update last login
    user.last_login_at = new Date();
    await user.save();
    
    const token = generateToken(user);
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.register = async (req, res) => {
  try {
    const { email, password, first_name, last_name, role } = req.body;
    
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    
    const user = await User.create({
      email,
      password_hash,
      first_name,
      last_name,
      role: role || 'tenant'
    });
    
    const token = generateToken(user);
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.registerTenant = async (req, res) => {
  try {
    const { line_uid, first_name, last_name, phone, room_id } = req.body;
    
    if (!line_uid || !first_name || !last_name || !phone || !room_id) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if user already exists
    let user = await User.findOne({ where: { line_user_id: line_uid } });
    if (!user) {
      user = await User.create({
        first_name,
        last_name,
        phone,
        line_user_id: line_uid,
        role: 'tenant'
      });
    }

    // Create tenant record
    const tenant = await Tenant.create({
      user_id: user.id,
      room_id: room_id
    });

    // Update room status
    const room = await Room.findByPk(room_id);
    if (room) {
      room.status = 'occupied';
      await room.save();
    }

    const token = generateToken(user);

    res.status(201).json({
      message: 'Registration successful',
      token,
      tenant
    });
  } catch (error) {
    console.error('Register Tenant error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.setupAdmin = async (req, res) => {
  try {
    const email = 'admin@samruay.com';
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.json({ message: 'Admin already exists', email });
    }
    const bcrypt = require('bcryptjs');
    const password_hash = await bcrypt.hash('123456', 10);
    await User.create({
      email,
      password_hash,
      first_name: 'Admin',
      last_name: 'System',
      role: 'admin'
    });
    res.json({ message: 'Admin account created successfully!', email, password: '123456' });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getLiffBill = async (req, res) => {
  try {
    const { line_uid } = req.query;
    if (!line_uid) {
      return res.status(400).json({ message: 'line_uid is required' });
    }

    const user = await User.findOne({ where: { line_user_id: line_uid } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const tenant = await Tenant.findOne({
      where: { user_id: user.id },
      include: [{ model: Room, as: 'room' }]
    });

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // Find any pending invoice for this tenant
    const pendingBill = await Invoice.findOne({
      where: {
        tenant_id: tenant.id,
        status: 'pending'
      },
      order: [['created_at', 'DESC']]
    });

    res.json({
      tenant: {
        first_name: user.first_name,
        last_name: user.last_name,
        room_number: tenant.room?.room_number || '-'
      },
      bill: pendingBill ? {
        id: pendingBill.id,
        invoice_number: pendingBill.invoice_number,
        period_month: pendingBill.period_month,
        period_year: pendingBill.period_year,
        total: parseFloat(pendingBill.total),
        due_date: pendingBill.due_date
      } : null
    });
  } catch (error) {
    console.error('Get LIFF bill error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
