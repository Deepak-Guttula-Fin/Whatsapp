const { Telegraf, Markup } = require('telegraf');
const { handleMessage } = require('./bot');
const { TASKS } = require('./tasks');
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
    await ctx.reply(
      'DailyXP bot is ready. Send /tasks to open the task board, or use commands like help, report, reset, or workout done.'
    );
  });

  bot.on('text', async (ctx) => {
    const chatId = ctx.chat?.id;
    const text = (ctx.message?.text || '').trim();
    if (!chatId || !text) return;

    const cleaned = text.replace(/^\/+/, '').trim();
    const from = `telegram:${chatId}`;

    if (/^(tasks|menu)$/i.test(cleaned)) {
      await ctx.reply(buildTaskMenuText(), buildTaskKeyboard());
      return;
    }

    try {
      await handleMessage(from, cleaned);
    } catch (err) {
      console.error('[Telegram] Error:', err);
    }
  });

  bot.action(/^task:([^:]+):(done|undone)$/, async (ctx) => {
    const chatId = ctx.chat?.id;
    const match = ctx.match || [];
    const taskKey = match[1];
    const action = match[2];

    if (!chatId || !taskKey || !action || !TASKS[taskKey]) {
      await ctx.answerCbQuery('Unknown task');
      return;
    }

    const from = `telegram:${chatId}`;
    const label = TASKS[taskKey].label;

    try {
      await ctx.answerCbQuery(action === 'done' ? 'Marked accomplished' : 'Marked unaccomplished');
      if (action === 'done') {
        await handleMessage(from, taskKey);
      } else {
        await handleMessage(from, `undo ${taskKey}`);
      }
    } catch (err) {
      console.error('[Telegram] Callback error:', err);
      await ctx.reply(`Sorry, I couldn't update *${label}* right now.`);
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

function buildTaskMenuText() {
  const groups = [
    ['Physical Health', ['workout', 'hydration', 'sleep', 'shower', 'eating']],
    ['Learning', ['reading', 'speaking', 'writing', 'listening']],
    ['Finance', ['portfolio', 'economic']]
  ];

  let message = '📋 *Task Board*\n\nTap *Accomplished* or *Unaccomplished* for any task.\nIf you mark a learning task as accomplished, I will ask for the time spent.\n\n';

  for (const [title, keys] of groups) {
    message += `*${title}*\n`;
    for (const key of keys) {
      const task = TASKS[key];
      if (task) message += `• ${task.label}\n`;
    }
    message += '\n';
  }

  return message.trim();
}

function buildTaskKeyboard() {
  const rows = Object.entries(TASKS).map(([key, task]) => ([
    Markup.button.callback(`✅ ${task.label}`, `task:${key}:done`),
    Markup.button.callback(`❌ ${task.label}`, `task:${key}:undone`)
  ]));

  return Markup.inlineKeyboard(rows);
}

module.exports = { startTelegramBot };
