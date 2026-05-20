const { Telegraf } = require('telegraf');
const { handleMessage } = require('./bot');
const { setTelegramBot } = require('./messaging');

function startTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log('[Telegram] TELEGRAM_BOT_TOKEN not set; Telegram bot disabled');
    return null;
  }

  console.log('[Telegram] Initializing bot...');
  const bot = new Telegraf(token);
  setTelegramBot(bot);

  bot.start(async (ctx) => {
    await ctx.reply('DailyXP bot is ready. Send commands like help, report, reset, or workout done.');
  });

  bot.on('text', async (ctx) => {
    const chatId = ctx.chat?.id;
    const text = (ctx.message?.text || '').trim();
    if (!chatId || !text) return;

    const cleaned = text.replace(/^\/+/, '').trim();
    const from = `telegram:${chatId}`;

    try {
      await handleMessage(from, cleaned);
    } catch (err) {
      console.error('[Telegram] Error:', err);
    }
  });

  bot.catch((err) => {
    console.error('[Telegram] Unhandled error:', err);
  });

  bot.launch()
    .then(() => console.log('[Telegram] Bot started'))
    .catch((err) => {
      console.error('[Telegram] Failed to start:', err);
      if (err && err.response && err.response.description) {
        console.error('[Telegram] Launch error description:', err.response.description);
      }
    });

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  return bot;
}

module.exports = { startTelegramBot };
