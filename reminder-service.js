const { Telegraf } = require('telegraf');
const { getTodayRecord, getRecord, getRange, getSchedulerState, markSchedulerSlotSent } = require('./db');
const { buildDashboard } = require('./dashboard');
const { generateExcel } = require('./excel');
const { getTaskSections } = require('./tasks');

let telegramSender = null;

function getTelegramSender() {
  if (telegramSender) return telegramSender;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }

  telegramSender = new Telegraf(token).telegram;
  return telegramSender;
}

function getTelegramSubscribers() {
  const env = process.env.TELEGRAM_SUBSCRIBERS || '';
  return env.split(',').map(s => s.trim()).filter(Boolean).map(normalizeTelegramSubscriber);
}

function normalizeTelegramSubscriber(value) {
  return value.startsWith('telegram:') ? value : `telegram:${value}`;
}

function getAllSubscribers() {
  return getTelegramSubscribers();
}

function getIstParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    hour: Number(map.hour),
    minute: Number(map.minute)
  };
}

function getReminderSlots() {
  return [
    { key: 'morning',   label: 'Morning Check-in',   hour: 9,  minute: 0 },
    { key: 'afternoon', label: 'Afternoon Update',   hour: 15, minute: 0 },
    { key: 'evening',   label: 'Evening Progress',   hour: 18, minute: 0 },
    { key: 'night',     label: 'End-of-Day Report',  hour: 22, minute: 0 }
  ];
}

function getReminderSlot(slotKey) {
  return getReminderSlots().find(slot => slot.key === slotKey) || null;
}

function slotTimeKey(slot) {
  return `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`;
}

function isSlotDue(now, slot) {
  if (now.hour < slot.hour) return false;
  if (now.hour === slot.hour && now.minute < slot.minute) return false;
  return true;
}

async function sendDashboardToSubscribers(label) {
  const subscribers = getAllSubscribers();
  if (!subscribers.length) {
    throw new Error(`No Telegram subscribers configured for ${label}`);
  }

  console.log(`[Reminder] ${label} — sending to ${subscribers.length} subscriber(s)`);
  console.log(`[Reminder] Telegram subscribers: ${subscribers.join(', ')}`);
  const telegram = getTelegramSender();
  for (const recipient of subscribers) {
    try {
      const text = label === 'Morning Check-in'
        ? await buildMorningCarryoverMessage(recipient)
        : buildDashboard(await getTodayRecord(recipient), label);
      await telegram.sendMessage(telegramChatId(recipient), text, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error(`[Reminder] Error for ${recipient}:`, err.message);
    }
  }
}

async function sendDailyRemindersNow() {
  return sendDailyRemindersNowInternal(false);
}

async function sendDailyRemindersForce() {
  return sendDailyRemindersNowInternal(true);
}

async function sendReminderSlot(slotKey, force = false) {
  const slot = getReminderSlot(slotKey);
  if (!slot) {
    throw new Error(`Unknown reminder slot: ${slotKey}`);
  }

  const now = getIstParts();
  const state = force ? { sentSlots: {} } : await getSchedulerState(now.date);
  const sentSlots = state.sentSlots || {};
  if (!force && sentSlots[slot.key]) {
    console.log(`[Reminder] ${slot.label} already sent for ${now.date}`);
    return;
  }

  await sendDashboardToSubscribers(slot.label);
  if (!force) {
    await markSchedulerSlotSent(now.date, slot.key);
  }
}

async function sendDailyRemindersNowInternal(force) {
  const now = getIstParts();
  const state = force ? { sentSlots: {} } : await getSchedulerState(now.date);
  const sentSlots = state.sentSlots || {};

  for (const slot of getReminderSlots()) {
    if (!isSlotDue(now, slot)) continue;
    if (sentSlots[slot.key]) continue;

    await sendDashboardToSubscribers(slot.label);
    await markSchedulerSlotSent(now.date, slot.key);
  }
}

async function sendWeeklyExcel() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  const subscribers = getAllSubscribers();
  if (!subscribers.length) {
    throw new Error('No Telegram subscribers configured for weekly Excel');
  }
  console.log(`[Reminder] Weekly Excel — sending to ${subscribers.length} subscriber(s)`);
  console.log(`[Reminder] Telegram subscribers: ${subscribers.join(', ')}`);

  for (const recipient of subscribers) {
    try {
      const rows = await getRange(recipient, start, now);
      const buf = await generateExcel(rows, `Weekly Report — ${fmtRange(start, now)}`);
      await getTelegramSender().sendDocument(
        telegramChatId(recipient),
        { source: buf, filename: 'weekly_report.xlsx' },
        { caption: 'Weekly XP Report' }
      );
    } catch (err) {
      console.error(`[Reminder] Weekly error for ${recipient}:`, err.message);
    }
  }
}

async function sendMonthlyExcel() {
  const now = new Date();
  const day = now.getDate();
  const eom = lastDayOfMonth(now);
  if (day !== 10 && day !== 20 && day !== eom) return;

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const label = day === 10 ? 'MTD — 1st to 10th'
    : day === 20 ? 'MTD — 1st to 20th'
    : `MTD — Full Month (1st to ${eom}th)`;

  const subscribers = getAllSubscribers();
  if (!subscribers.length) {
    throw new Error('No Telegram subscribers configured for monthly Excel');
  }
  console.log(`[Reminder] ${label} — sending to ${subscribers.length} subscriber(s)`);
  console.log(`[Reminder] Telegram subscribers: ${subscribers.join(', ')}`);

  for (const recipient of subscribers) {
    try {
      const rows = await getRange(recipient, start, now);
      const buf = await generateExcel(rows, label);
      await getTelegramSender().sendDocument(
        telegramChatId(recipient),
        { source: buf, filename: 'mtd_report.xlsx' },
        { caption: label }
      );
    } catch (err) {
      console.error(`[Reminder] MTD error for ${recipient}:`, err.message);
    }
  }
}

function telegramChatId(value) {
  return String(value).replace(/^telegram:/, '');
}

async function buildMorningCarryoverMessage(recipient) {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);
  const yesterdayRecord = await getRecord(recipient, yesterdayKey);
  const sections = getTaskSections(yesterday);

  const carryoverSections = [];
  for (const section of sections) {
    const pending = section.tasks.filter(([key]) => !yesterdayRecord.done?.[key]);
    if (pending.length > 0) {
      carryoverSections.push({
        label: section.label,
        tasks: pending
      });
    }
  }

  let msg = `📋 *Morning Check-in*\n`;
  msg += `⏮ *Yesterday's unfinished tasks*\n\n`;

  if (!carryoverSections.length) {
    msg += `_(All tasks from yesterday were completed.)_`;
    return msg;
  }

  for (const section of carryoverSections) {
    msg += `*${section.label}*\n`;
    for (const [, task] of section.tasks) {
      msg += `  • ${task.label} — *+${task.xp >= 0 ? '+' : ''}${task.xp} XP*\n`;
    }
    msg += '\n';
  }

  msg += `_Continue these today to clear yesterday's backlog._`;
  return msg;
}

function lastDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function fmtRange(start, end) {
  const opts = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-IN', opts)} – ${end.toLocaleDateString('en-IN', opts)}`;
}

module.exports = {
  sendDailyRemindersNow,
  sendDailyRemindersForce,
  sendReminderSlot,
  sendWeeklyExcel,
  sendMonthlyExcel,
  getReminderSlots,
  getAllSubscribers
};
