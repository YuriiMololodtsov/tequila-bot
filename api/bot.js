const { Telegraf } = require('telegraf');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const botToken = process.env.BOT_TOKEN;

const supabase = createClient(supabaseUrl, supabaseKey);
const bot = new Telegraf(botToken);

bot.command('start', (ctx) => {
  ctx.reply('Добро пожаловать бот группы Наливай, а то уйду! Введите название станции метро, чтобы найти ближайшие бары.');
});

bot.hears(/.*/, async (ctx) => {
  const stationName = ctx.message.text;

  try {
    const { data: stations, error: stationError } = await supabase
      .from('metro_stations')
      .select('*')
      .ilike('name', `%${stationName}%`);

    if (stationError) {
      return ctx.reply('Произошла ошибка при поиске станции метро. Попробуйте еще раз позже.');
    }

    if (stations.length === 0) {
      return ctx.reply('Станция метро не найдена. Попробуйте еще раз.');
    }

    const station = stations[0];
    const { data: bars, error: barsError } = await supabase
      .from('bars')
      .select('*')
      .eq('metro_station_id', station.id);

    if (barsError) {
      return ctx.reply('Произошла ошибка при поиске баров. Попробуйте еще раз позже.');
    }

    if (bars.length === 0) {
      return ctx.reply('Бары не найдены на этой станции.');
    }

    const barMessages = bars.map(bar => {
      return `${bar.name}\n${bar.description}\nАдрес: ${bar.address}\nСкидки: ${bar.discounts}\n[Открыть карту](https://www.google.com/maps/search/?api=1&query=${bar.latitude},${bar.longitude})`;
    });

    for (const message of barMessages) {
      await ctx.reply(message, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    ctx.reply('Произошла ошибка при выполнении запроса. Попробуйте еще раз позже.');
  }
});

bot.catch((err) => {
  console.error('Произошла ошибка в боте:', err);
});

module.exports = async (req, res) => {
  try {
    await bot.handleUpdate(req.body, res);
  } catch (err) {
    console.error('Ошибка обработки обновления:', err);
    res.status(500).send('Ошибка обработки обновления');
  }
};

if (process.env.NODE_ENV !== 'production') {
  bot.launch();
}

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
