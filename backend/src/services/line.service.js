const axios = require('axios');

class LineService {
  constructor() {
    this.channelId = process.env.LINE_CHANNEL_ID || 'your-line-channel-id';
    this.channelSecret = process.env.LINE_CHANNEL_SECRET || 'your-line-channel-secret';
    this.channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
  }

  async getAccessToken() {
    if (this.channelAccessToken && this.channelAccessToken !== 'mock_token') return this.channelAccessToken;
    
    try {
      const response = await axios.post('https://api.line.me/oauth2/v2.1/token', new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.channelId,
        client_secret: this.channelSecret
      }).toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      this.channelAccessToken = response.data.access_token;
      return this.channelAccessToken;
    } catch (err) {
      console.error('Failed to get LINE token:', err.response?.data || err.message);
      return 'MOCK_TOKEN'; // fallback
    }
  }

  async sendFlexMessage(userId, flexContent, altText = 'You have a new message') {
    const token = await this.getAccessToken();
    if (token === 'MOCK_TOKEN') {
      console.log(`[MOCK LINE API] Sending Flex Message to ${userId}:`, JSON.stringify(flexContent, null, 2));
      return { status: 'success', mock: true };
    }

    try {
      const response = await axios.post('https://api.line.me/v2/bot/message/push', {
        to: userId,
        messages: [{
          type: 'flex',
          altText: altText,
          contents: flexContent
        }]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Line API Error:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  async sendInvoiceNotification(userId, invoice) {
    const flexMessage = {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "SAMRUAY SPACE",
            weight: "bold",
            color: "#F97316",
            size: "sm"
          },
          {
            type: "text",
            text: "Invoice Generated",
            weight: "bold",
            size: "xl",
            margin: "md"
          },
          {
            type: "text",
            text: `Please pay by ${invoice.due_date}`,
            size: "xs",
            color: "#aaaaaa",
            wrap: true
          },
          {
            type: "separator",
            margin: "xxl"
          },
          {
            type: "box",
            layout: "vertical",
            margin: "xxl",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: "Total Amount",
                    size: "sm",
                    color: "#555555"
                  },
                  {
                    type: "text",
                    text: `฿${invoice.total}`,
                    size: "sm",
                    color: "#111111",
                    align: "end",
                    weight: "bold"
                  }
                ]
              }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#F97316",
            action: {
              type: "uri",
              label: "View & Pay",
              uri: `https://liff.line.me/MOCK_LIFF_ID/invoices/${invoice.id}`
            }
          }
        ]
      }
    };

    return this.sendFlexMessage(userId, flexMessage, `Invoice ${invoice.invoice_number} is ready`);
  }
}

module.exports = new LineService();
