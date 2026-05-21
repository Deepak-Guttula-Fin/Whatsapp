const { getTodayRecord, getRange, getSchedulerState, markSchedulerSlotSent } = require('./db');
const { buildDashboard } = require('./dashboard');
const { generateExcel } = require('./excel');
const { sendMessage, sendFile } = require('./messaging');

function getSubscribers() {
  const env = process.env.SUBSCRIBERS || '';
  return env.split(',').map(s => s.trim()).filter(Boolean);
}

function getTelegramSubscribers() {
  const env = process.env.TELEGRAM_SUBSCRIBERS || '';
  return env.split(',').map(s => s.trim()).filter(Boolean).map(normalizeTelegramSubscriber);
}

function normalizeTelegramSubscriber(value) {
  return value.startsWith('telegram:') ? value : `telegram:${value}`;
}

function getAllSubscribers() {
  return [...getSubscribers(), ...getTelegramSubscribers()];
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
    console.log(`[Reminder] No subscribers configured for ${label}`);
    return;
  }

  console.log(`[Reminder] ${label} — sending to ${subscribers.length} subscriber(s)`);
  for (const recipient of subscribers) {
    try {
      const record = await getTodayRecord(recipient);
      const text = buildDashboard(record, label);
      await sendMessage(recipient, text);
    } catch (err) {
      console.error(`[Reminder] Error for ${recipient}:`, err.message);
    }
  }
}

async function sendDailyRemindersNow() {
  const now = getIstParts();
  const state = await getSchedulerState(now.date);
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
  console.log(`[Reminder] Weekly Excel — sending to ${subscribers.length} subscriber(s)`);

  for (const recipient of subscribers) {
    try {
      const rows = await getRange(recipient, start, now);
      const buf = await generateExcel(rows, `Weekly Report — ${fmtRange(start, now)}`);
      await sendFile(recipient, buf, 'weekly_report.xlsx', 'Weekly XP Report');
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
  console.log(`[Reminder] ${label} — sending to ${subscribers.length} subscriber(s)`);

  for (const recipient of subscribers) {
    try {
      const rows = await getRange(recipient, start, now);
      const buf = await generateExcel(rows, label);
      await sendFile(recipient, buf, 'mtd_report.xlsx', label);
    } catch (err) {
      console.error(`[Reminder] MTD error for ${recipient}:`, err.message);
    }
  }
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
  sendWeeklyExcel,
  sendMonthlyExcel,
  getReminderSlots,
  getAllSubscribers
};
