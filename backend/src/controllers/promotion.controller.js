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
      order: [['created_at', 'DESC']]
    });
    res.json(promotions);
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

exports.broadcastPromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findByPk(req.params.id);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    const appUrl = process.env.APP_URL || 'https://samruay-backend.onrender.com';
    const messages = [];

    if (promotion.image_url) {
      const imageUrl = `${appUrl}${promotion.image_url}`;
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
