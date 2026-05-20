const { sendMessage: sendWhatsAppMessage, sendFile: sendWhatsAppFile } = require('./whatsapp');

let telegramBot = null;

function setTelegramBot(bot) {
  telegramBot = bot;
}

function isTelegramRecipient(to) {
  return typeof to === 'string' && to.startsWith('telegram:');
}

function telegramChatId(to) {
  return String(to).replace(/^telegram:/, '');
}

async function sendMessage(to, body) {
  if (isTelegramRecipient(to)) {
    if (!telegramBot) throw new Error('Telegram bot is not initialized');
    const chatId = telegramChatId(to);
    try {
      await telegramBot.telegram.sendMessage(chatId, body, { parse_mode: 'Markdown' });
    } catch {
      await telegramBot.telegram.sendMessage(chatId, body);
    }
    return;
  }

  return sendWhatsAppMessage(to, body);
}

async function sendFile(to, buffer, filename, caption) {
  if (isTelegramRecipient(to)) {
    if (!telegramBot) throw new Error('Telegram bot is not initialized');
    const chatId = telegramChatId(to);
    await telegramBot.telegram.sendDocument(
      chatId,
      { source: buffer, filename },
      { caption }
    );
    return;
  }

  return sendWhatsAppFile(to, buffer, filename, caption);
}

module.exports = { sendMessage, sendFile, setTelegramBot };
