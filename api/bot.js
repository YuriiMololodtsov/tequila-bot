const { Telegraf } = require('telegraf');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const bot = new Telegraf(process.env.BOT_TOKEN);

// Команда для выбора станции метро
bot.command('start', (ctx) => {
  ctx.reply('Добро пожаловать бот группы "Наливай, а то уйду"! Введите название станции метро, чтобы найти ближайшие бары.');
});

bot.hears(/.*/, async (ctx) => {
  const stationName = ctx.message.text;
  const { data: stations, error: stationError } = await supabase
    .from('metro_stations')
    .select('*')
    .ilike('name', `%${stationName}%`);

  if (stationError || stations.length === 0) {
    return ctx.reply('Станция метро не найдена. Попробуйте еще раз.');
  }

  const station = stations[0];
  const { data: bars, error: barsError } = await supabase
    .from('bars')
    .select('*')
    .eq('metro_station_id', station.id);

  if (barsError || bars.length === 0) {
    return ctx.reply('Бары не найдены на этой станции.');
  }

  const barMessages = bars.map(bar => {
    return `${bar.name}\n${bar.description}\nАдрес: ${bar.address}\nСкидки: ${bar.discounts}\n[Открыть карту](https://www.google.com/maps/search/?api=1&query=${bar.latitude},${bar.longitude})`;
  });

  ctx.reply(barMessages.join('\n\n'), { parse_mode: 'Markdown' });
});

// Создание endpoint для Vercel
module.exports = async (req, res) => {
  try {
    await bot.handleUpdate(req.body, res);
  } catch (err) {
    res.status(500).send('Error handling update');
  }
};

// Для локального запуска, если необходимо
if (process.env.NODE_ENV !== 'production') {
  bot.launch();
}

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));



