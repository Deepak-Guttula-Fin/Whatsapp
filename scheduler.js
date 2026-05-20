// ============================================================
//  scheduler.js  —  Cron jobs for all automated sends
//  Times: 9AM, 3PM, 6PM, 10PM daily  |  Sunday 10PM weekly
//         10th, 20th, EOM 10PM monthly
// ============================================================

const cron = require('node-cron');
const { getTodayRecord, getRange }       = require('./db');
const { buildDashboard, formatDateTime } = require('./dashboard');
const { generateExcel }                  = require('./excel');
const { sendMessage, sendFile }          = require('./messaging');

// ── Subscriber list ──────────────────────────────────────────
// In production: load from DB.  Format: '+919XXXXXXXXX'
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

// ── Labels for each check-in time ────────────────────────────
const REPORT_LABELS = {
  '09:00': 'Morning Check-in',
  '15:00': 'Afternoon Update',
  '18:00': 'Evening Progress',
  '22:00': 'End-of-Day Report'
};

// ── Daily reports: 9AM, 3PM, 6PM, 10PM (IST = UTC+5:30) ─────
//  Cron format: minute hour * * *  (UTC times for IST)
const dailySchedules = [
  { cron: '30 3  * * *', label: 'Morning Check-in'   },  // 9:00 AM IST
  { cron: '30 9  * * *', label: 'Afternoon Update'    },  // 3:00 PM IST
  { cron: '30 12 * * *', label: 'Evening Progress'    },  // 6:00 PM IST
  { cron: '30 16 * * *', label: 'End-of-Day Report'   },  // 10:00 PM IST
];

for (const { cron: expr, label } of dailySchedules) {
  cron.schedule(expr, async () => {
    console.log(`[Scheduler] ${label} — sending to all subscribers`);
    for (const phone of getAllSubscribers()) {
      try {
        const record = await getTodayRecord(phone);
        const text   = buildDashboard(record, label);
        await sendMessage(phone, text);
      } catch (err) {
        console.error(`[Scheduler] Error for ${phone}:`, err.message);
      }
    }
  }, { timezone: 'Asia/Kolkata' });
}

// ── Weekly Excel: Sunday 10:00 PM IST ────────────────────────
cron.schedule('0 22 * * 0', async () => {
  console.log('[Scheduler] Weekly Excel — sending');
  const now   = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 6);  // Mon–Sun
  start.setHours(0,0,0,0);

  for (const phone of getAllSubscribers()) {
    try {
      const rows = await getRange(phone, start, now);
      const buf  = await generateExcel(rows, `Weekly Report — ${fmtRange(start, now)}`);
      await sendFile(phone, buf, 'weekly_report.xlsx', 'Weekly XP Report');
    } catch (err) {
      console.error(`[Scheduler] Weekly error for ${phone}:`, err.message);
    }
  }
}, { timezone: 'Asia/Kolkata' });

// ── MTD Excel: 10th, 20th, and EOM — all at 10:00 PM IST ────
cron.schedule('0 22 10,20,28,29,30,31 * *', async () => {
  const today = new Date();
  const day   = today.getDate();
  const eom   = lastDayOfMonth(today);

  // Only fire on 10th, 20th, or EOM
  if (day !== 10 && day !== 20 && day !== eom) return;

  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const label = day === 10  ? `MTD — 1st to 10th`
              : day === 20  ? `MTD — 1st to 20th`
              : `MTD — Full Month (1st to ${eom}th)`;

  console.log(`[Scheduler] ${label} — sending`);

  for (const phone of getAllSubscribers()) {
    try {
      const rows = await getRange(phone, start, today);
      const buf  = await generateExcel(rows, label);
      await sendFile(phone, buf, 'mtd_report.xlsx', label);
    } catch (err) {
      console.error(`[Scheduler] MTD error for ${phone}:`, err.message);
    }
  }
}, { timezone: 'Asia/Kolkata' });

// ── Utils ─────────────────────────────────────────────────────
function lastDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function fmtRange(start, end) {
  const opts = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-IN', opts)} – ${end.toLocaleDateString('en-IN', opts)}`;
}

console.log('[Scheduler] All cron jobs registered (timezone: Asia/Kolkata)');
module.exports = {};
