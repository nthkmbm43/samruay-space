const { Setting } = require('../models');

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
    
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
