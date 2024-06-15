const { Telegraf } = require('telegraf');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('Starting bot...');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.command('start', (ctx) => {
  console.log('Получена команда /start');
  ctx.reply('Добро пожаловать бот группы Наливай, а то уйду! Введите название станции метро, чтобы найти ближайшие бары.');
});

bot.hears(/.*/, async (ctx) => {
  const stationName = ctx.message.text;
  console.log(`Поиск станции метро: ${stationName}`);

  // Логирование перед запросом к базе данных
  console.log('Выполнение запроса к базе данных...');

  const { data: stations, error: stationError } = await supabase
    .from('metro_stations')
    .select('*')
    .ilike('name', `%${stationName}%`);

  // Логирование после запроса к базе данных
  console.log('Запрос выполнен. Данные станций:', stations);
  if (stationError) {
    console.log(`Ошибка поиска станции метро: ${stationError.message}`);
    return ctx.reply('Произошла ошибка при поиске станции метро. Попробуйте еще раз позже.');
  }

  if (stations.length === 0) {
    console.log('Станция метро не найдена');
    return ctx.reply('Станция метро не найдена. Попробуйте еще раз.');
  }

  const station = stations[0];
  const { data: bars, error: barsError } = await supabase
    .from('bars')
    .select('*')
    .eq('metro_station_id', station.id);

  if (barsError) {
    console.log(`Ошибка поиска баров: ${barsError.message}`);
    return ctx.reply('Произошла ошибка при поиске баров. Попробуйте еще раз позже.');
  }

  console.log('Найденные бары:', bars);

  if (bars.length === 0) {
    console.log('Бары не найдены на этой станции');
    return ctx.reply('Бары не найдены на этой станции.');
  }

  const barMessages = bars.map(bar => {
    return `${bar.name}\n${bar.description}\nАдрес: ${bar.address}\nСкидки: ${bar.discounts}\n[Открыть карту](https://www.google.com/maps/search/?api=1&query=${bar.latitude},${bar.longitude})`;
  });

  console.log(`Найдено баров: ${bars.length}`);
  ctx.reply(barMessages.join('\n\n'), { parse_mode: 'Markdown' });
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
