const { Setting, Property } = require('../models');

exports.getSettings = async (req, res) => {
  try {
    const settings = await Setting.findAll();
    const settingsObject = {};
    settings.forEach(s => {
      settingsObject[s.key] = s.value;
    });
    res.json(settingsObject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const settingsData = req.body;
    
    // settingsData is expected to be an object like { elec_rate: '8', water_rate: '18' }
    for (const [key, value] of Object.entries(settingsData)) {
      const [setting, created] = await Setting.findOrCreate({
        where: { key },
        defaults: { value: String(value) }
      });
      
      if (!created) {
        setting.value = String(value);
        await setting.save();
      }
    }

    // Sync water_rate and elec_rate to the Property table
    if (settingsData.water_rate !== undefined || settingsData.elec_rate !== undefined) {
      const updateData = {};
      if (settingsData.water_rate !== undefined) updateData.water_rate = parseFloat(settingsData.water_rate);
      if (settingsData.elec_rate !== undefined) updateData.elec_rate = parseFloat(settingsData.elec_rate);
      await Property.update(updateData, { where: {} });
    }
    
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
