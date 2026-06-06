const { Promotion, Property } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const line = require('@line/bot-sdk');

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
};
const client = new line.messagingApi.MessagingApiClient(lineConfig);

exports.getAllPromotions = async (req, res) => {
  try {
    const promotions = await Promotion.findAll({
      order: [['start_date', 'ASC']]
    });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const active = [];
    const upcoming = [];
    const past = [];

    promotions.forEach(p => {
      const start = new Date(p.start_date);
      start.setHours(0, 0, 0, 0);
      let end = null;
      if (p.end_date) {
        end = new Date(p.end_date);
        end.setHours(23, 59, 59, 999);
      }

      if (start <= now && (!end || end >= now)) {
        active.push(p);
      } else if (start > now) {
        upcoming.push(p);
      } else {
        past.push(p);
      }
    });

    // Sort past by end_date DESC
    past.sort((a, b) => {
      const endA = a.end_date ? new Date(a.end_date).getTime() : 0;
      const endB = b.end_date ? new Date(b.end_date).getTime() : 0;
      return endB - endA;
    });

    res.json([...active, ...upcoming, ...past]);
  } catch (error) {
    console.error('Error fetching promotions:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createPromotion = async (req, res) => {
  try {
    const { name, description, start_date, end_date } = req.body;
    let image_url = null;

    if (req.file) {
      const fileData = fs.readFileSync(req.file.path);
      const base64Data = fileData.toString('base64');
      image_url = `data:${req.file.mimetype};base64,${base64Data}`;
    }

    const properties = await Property.findAll({ limit: 1 });
    const property_id = properties.length > 0 ? properties[0].id : null;

    const promotion = await Promotion.create({
      property_id,
      name,
      description,
      type: 'discount',
      value: 0,
      start_date: start_date || new Date(),
      end_date: end_date || null,
      image_url,
      created_by: req.user.id
    });

    res.status(201).json(promotion);
  } catch (error) {
    console.error('Error creating promotion:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updatePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findByPk(req.params.id);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    const { name, description, start_date, end_date, is_active_auto } = req.body;
    let image_url = promotion.image_url;

    if (req.file) {
      const fileData = fs.readFileSync(req.file.path);
      const base64Data = fileData.toString('base64');
      image_url = `data:${req.file.mimetype};base64,${base64Data}`;
    }

    await promotion.update({
      name: name !== undefined ? name : promotion.name,
      description: description !== undefined ? description : promotion.description,
      start_date: start_date !== undefined ? start_date : promotion.start_date,
      end_date: end_date !== undefined ? end_date : promotion.end_date,
      is_active_auto: is_active_auto !== undefined ? is_active_auto === 'true' || is_active_auto === true : promotion.is_active_auto,
      image_url
    });

    res.json(promotion);
  } catch (error) {
    console.error('Error updating promotion:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deletePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findByPk(req.params.id);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }
    
    if (promotion.image_url) {
      const filePath = path.join(__dirname, '../..', promotion.image_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await promotion.destroy();
    res.json({ message: 'Promotion deleted successfully' });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.serveImage = async (req, res) => {
  try {
    const promotion = await Promotion.findByPk(req.params.id);
    if (!promotion || !promotion.image_url || !promotion.image_url.startsWith('data:')) {
      return res.status(404).send('Image not found');
    }

    // Parse data URI
    const matches = promotion.image_url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).send('Invalid image format');
    }

    const mimeType = matches[1];
    const imageBuffer = Buffer.from(matches[2], 'base64');

    res.set('Content-Type', mimeType);
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.send(imageBuffer);
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).send('Server error');
  }
};

exports.broadcastPromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findByPk(req.params.id);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    const appUrl = process.env.APP_URL || 'https://samruay-backend.onrender.com';
    const messages = [];

    if (promotion.image_url) {
      const imageUrl = `${appUrl}/api/promotions/image/${promotion.id}`;
      messages.push({
        type: 'image',
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl
      });
    }

    const textMessage = `📣 ประกาศ/โปรโมชั่น:\n${promotion.name}\n${promotion.description || ''}`;
    messages.push({ type: 'text', text: textMessage });

    await client.broadcast({ messages });

    res.json({ message: 'Broadcasted successfully' });
  } catch (error) {
    console.error('Error broadcasting promotion:', error);
    res.status(500).json({ message: 'Failed to broadcast' });
  }
};
