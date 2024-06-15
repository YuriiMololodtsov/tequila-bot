const { Telegraf } = require('telegraf');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('Starting bot...');

// Логирование переменных окружения
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const botToken = process.env.BOT_TOKEN;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey);
console.log('Bot Token:', botToken);

if (!supabaseUrl || !supabaseKey || !botToken) {
  throw new Error('Переменные окружения не настроены правильно');
}

const supabase = createClient(supabaseUrl, supabaseKey);
const bot = new Telegraf(botToken);

bot.command('start', (ctx) => {
  console.log('Получена команда /start');
  ctx.reply('Добро пожаловать бот группы Наливай, а то уйду! Введите название станции метро, чтобы найти ближайшие бары.');
});

bot.hears(/.*/, async (ctx) => {
  const stationName = ctx.message.text;
  console.log(`Поиск станции метро: ${stationName}`);

  try {
    const { data: stations, error: stationError } = await supabase
      .from('metro_stations')
      .select('*')
      .ilike('name', `%${stationName}%`);

    if (stationError) {
      console.log(`Ошибка запроса станций метро: ${stationError.message}`);
      return ctx.reply('Произошла ошибка при поиске станции метро. Попробуйте еще раз позже.');
    }

    console.log('Запрос станций метро выполнен. Данные станций:', stations);

    if (stations.length === 0) {
      console.log('Станция метро не найдена');
      return ctx.reply('Станция метро не найдена. Попробуйте еще раз.');
    }

    const station = stations[0];
    console.log(`Найдена станция метро: ${station.name} с ID: ${station.id}`);

    const { data: bars, error: barsError } = await supabase
      .from('bars')
      .select('*')
      .eq('metro_station_id', station.id);

    if (barsError) {
      console.log(`Ошибка запроса баров: ${barsError.message}`);
      return ctx.reply('Произошла ошибка при поиске баров. Попробуйте еще раз позже.');
    }

    console.log('Запрос баров выполнен. Найденные бары:', bars);

    if (bars.length === 0) {
      console.log('Бары не найдены на этой станции');
      return ctx.reply('Бары не найдены на этой станции.');
    }

    const barMessages = bars.map(bar => {
      return `${bar.name}\n${bar.description}\nАдрес: ${bar.address}\nСкидки: ${bar.discounts}\n[Открыть карту](https://www.google.com/maps/search/?api=1&query=${bar.latitude},${bar.longitude})`;
    });

    console.log(`Найдено баров: ${bars.length}`);
    ctx.reply(barMessages.join('\n\n'), { parse_mode: 'Markdown' });
  } catch (err) {
    console.error(`Ошибка выполнения запроса: ${err.message}`);
    ctx.reply('Произошла ошибка при выполнении запроса. Попробуйте еще раз позже.');
  }
});

bot.catch((err, ctx) => {
  console.log(`Ошибка: ${err}`);
});

module.exports = async (req, res) => {
  console.log('Received request...');
  try {
    await bot.handleUpdate(req.body, res);
  } catch (err) {
    console.log(`Ошибка обработки обновления: ${err}`);
    res.status(500).send('Error handling update');
  }
  console.log('Request handled.');
};

if (process.env.NODE_ENV !== 'production') {
  console.log('Запуск бота в режиме разработки...');
  bot.launch();
}

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
