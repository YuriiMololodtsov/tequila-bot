const axios = require('axios');
require('dotenv').config();

const setWebhook = async () => {
  const url = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/setWebhook`;
  const webhookUrl = 'https://tequila-bot.vercel.app/api/bot';

  try {
    const response = await axios.post(url, {
      url: webhookUrl,
    });
    console.log('Webhook set:', response.data);
  } catch (error) {
    console.error('Error setting webhook:', error);
  }
};

setWebhook();
