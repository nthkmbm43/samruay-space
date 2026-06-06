const { Property, User, Setting } = require('../models');

exports.getAllProperties = async (req, res) => {
  try {
    const properties = await Property.findAll({
      include: [{ model: User, as: 'owner', attributes: ['id', 'first_name', 'last_name', 'email'] }]
    });
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createProperty = async (req, res) => {
  try {
    const property = await Property.create(req.body);
    res.status(201).json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updatePropertyStatus = async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    
    await property.update({ is_active: req.body.is_active });
    res.json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({ attributes: { exclude: ['password_hash'] } });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Prevent changing your own role if needed, but for simplicity allow Super Admin to do it.
    await user.update({ role: req.body.role });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.toggleMaintenanceMode = async (req, res) => {
  try {
    const { is_active } = req.body;
    const [setting, created] = await Setting.findOrCreate({
      where: { key: 'maintenance_mode' },
      defaults: { value: String(is_active) }
    });
    
    if (!created) {
      await setting.update({ value: String(is_active) });
    }
    
    res.json({ message: `Maintenance mode ${is_active ? 'enabled' : 'disabled'}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
