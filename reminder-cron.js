require('dotenv').config();

const {
  sendDailyRemindersNow,
  sendDailyRemindersForce,
  sendReminderSlot,
  sendMoodPromptSlot,
  sendAllMoodPromptSlots,
  sendWeeklyExcel,
  sendMonthlyExcel
} = require('./reminder-service');

async function main() {
  const mode = (process.argv[2] || 'daily').toLowerCase();

  try {
    if (mode === 'daily') {
      await sendDailyRemindersNow();
    } else if (mode === 'force') {
      await sendDailyRemindersForce();
    } else if (mode === 'morning' || mode === 'afternoon' || mode === 'evening' || mode === 'night') {
      await sendReminderSlot(mode);
    } else if (mode.startsWith('mood-')) {
      const slotKey = mode.replace(/^mood-/, '');
      if (slotKey === 'force') {
        await sendAllMoodPromptSlots(true);
      } else {
        await sendMoodPromptSlot(slotKey, false);
      }
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
