const { Telegraf } = require('telegraf');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Логирование для отладки
console.log('Загрузка переменных окружения...');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY);
console.log('BOT_TOKEN:', process.env.BOT_TOKEN);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.command('start', (ctx) => {
  console.log('Получена команда /start');
  ctx.reply('Добро пожаловать бот группы Наливай, а то уйду! Введите название станции метро, чтобы найти ближайшие бары.');
});

bot.hears(/.*/, async (ctx) => {
  const stationName = ctx.message.text;
  console.log(`Поиск станции метро: ${stationName}`);
  const { data: stations, error: stationError } = await supabase
    .from('metro_stations')
    .select('*')
    .ilike('name', `%${stationName}%`);

  if (stationError) {
    console.log(`Ошибка поиска станции метро: ${stationError.message}`);
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
  }

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

// Создание endpoint для Vercel
module.exports = async (req, res) => {
  try {
    await bot.handleUpdate(req.body, res);
  } catch (err) {
    console.log(`Ошибка обработки обновления: ${err}`);
    res.status(500).send('Error handling update');
  }
};

// Для локального запуска, если необходимо
if (process.env.NODE_ENV !== 'production') {
  console.log('Запуск бота в режиме разработки...');
  bot.launch();
}

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
