const { Property, Setting } = require('../models');

exports.checkPropertyStatus = async (req, res, next) => {
  try {
    // 1. Check Global Maintenance Mode
    const maintenanceMode = await Setting.findOne({ where: { key: 'maintenance_mode' } });
    
    if (maintenanceMode && maintenanceMode.value === 'true') {
      // Allow Super Admin to bypass
      if (req.user && req.user.role === 'super_admin') {
        return next();
      }
      return res.status(503).json({ 
        message: 'System is currently under maintenance. Please try again later.' 
      });
    }

    // 2. Check Property-specific status if property_id is provided
    let property_id = req.headers['x-property-id'] || req.query?.property_id || req.body?.property_id;
    
    // Inject it so controllers can use it easily without checking headers
    if (req.headers['x-property-id']) {
       const newQuery = Object.assign({}, req.query || {}, { property_id: req.headers['x-property-id'] });
       Object.defineProperty(req, 'query', {
         value: newQuery,
         writable: true,
         configurable: true
       });
    }

    // Some routes might have property_id in params
    if (!property_id && req.params?.property_id) {
      property_id = req.params.property_id;
    }

    if (property_id) {
      const property = await Property.findByPk(property_id);
      
      if (!property) {
        return res.status(404).json({ message: 'Property not found' });
      }

      if (!property.is_active) {
        // Allow Super Admin to bypass
        if (req.user && req.user.role === 'super_admin') {
          return next();
        }
        return res.status(403).json({ 
          message: 'This property is currently inactive or suspended. Please contact the administrator.' 
        });
      }
    }

    next();
  } catch (error) {
    console.error('Property status check error:', error);
    res.status(500).json({ message: 'Server error during status check' });
  }
};
