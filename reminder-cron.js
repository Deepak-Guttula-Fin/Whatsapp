require('dotenv').config();

const {
  sendDailyRemindersNow,
  sendWeeklyExcel,
  sendMonthlyExcel
} = require('./reminder-service');

async function main() {
  const mode = (process.argv[2] || 'daily').toLowerCase();

  try {
    if (mode === 'daily') {
      await sendDailyRemindersNow();
    } else if (mode === 'weekly') {
      await sendWeeklyExcel();
    } else if (mode === 'monthly') {
      await sendMonthlyExcel();
    } else {
      throw new Error(`Unknown cron mode: ${mode}`);
    }
  } catch (err) {
    console.error('[Cron] Failed:', err);
    process.exitCode = 1;
  }
}

main().finally(() => {
  process.exit();
});
