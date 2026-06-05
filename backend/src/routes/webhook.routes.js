const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');
const line = require('@line/bot-sdk');

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || ''
};

// LINE webhook endpoint
router.post('/line', line.middleware(lineConfig), webhookController.handleLineWebhook);

module.exports = router;
