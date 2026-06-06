const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');
const line = require('@line/bot-sdk');

const { Property } = require('../models');

// Custom middleware to verify signature and parse body dynamically
const dynamicLineMiddleware = async (req, res, next) => {
  const propertyId = req.params.property_id;
  try {
    const property = await Property.findByPk(propertyId);
    if (!property) {
      return res.status(404).send('Property not found');
    }

    // Use property-level credentials first, then fallback to .env
    const channelSecret = property.line_channel_secret || process.env.LINE_CHANNEL_SECRET;
    const channelAccessToken = property.line_channel_access_token || process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

    if (!channelSecret) {
      console.error(`[Webhook] No LINE Channel Secret for property ${propertyId} and none in .env`);
      return res.status(400).send('LINE not configured: missing channel secret');
    }
    
    const lineConfig = {
      channelAccessToken,
      channelSecret
    };
    
    // Attach the config and property to req for later use in controller
    req.lineConfig = lineConfig;
    req.property = property;
    
    // Run the actual line middleware
    line.middleware(lineConfig)(req, res, next);
  } catch (error) {
    console.error('Dynamic LINE Middleware Error:', error);
    res.status(500).send('Server Error');
  }
};

// LINE webhook endpoint
router.post('/line/:property_id', dynamicLineMiddleware, webhookController.handleLineWebhook);

module.exports = router;
