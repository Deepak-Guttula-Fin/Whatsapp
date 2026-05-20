// ============================================================
//  DailyXP WhatsApp Bot  —  src/bot.js
//  Handles all incoming messages with dynamic NLP-style parsing
// ============================================================

const { getTodayRecord, upsertRecord, getRange, deleteRecord, deleteTodayRecord, deleteAllRecords } = require('./db');
const { buildDashboard }                          = require('./dashboard');
const { generateExcel }                           = require('./excel');
const { sendMessage, sendFile }                   = require('./whatsapp');
const { TASKS, REGRETS, normalize }               = require('./tasks');

// Per-user conversation state (in-memory; swap for Redis in prod)
const sessions = {};

// ── Entry point ──────────────────────────────────────────────
async function handleMessage(from, body) {
  const text  = body.trim();
  const lower = text.toLowerCase();
  const sess  = sessions[from] || (sessions[from] = {});

  if (sess.resetFlow) {
    return handleResetFlow(from, text, lower, sess);
  }

  // ── 1. Awaiting HH:MM time for a learning task ──────────────
  if (sess.awaitingTime) {
    const match = text.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const { taskKey, pendingTasks } = sess.awaitingTime;
      const today = await getTodayRecord(from);
      today.learning_times = today.learning_times || {};
      today.learning_times[taskKey] = text;
      await upsertRecord(from, today);

      pendingTasks.shift();                       // done with this one
      if (pendingTasks.length > 0) {
        const next = pendingTasks[0];
        sess.awaitingTime = { taskKey: next.key, pendingTasks };
        return sendMessage(from,
          `✅ Recorded *${text}* for ${TASKS[taskKey].label}.\n\n` +
          `⏱ *${TASKS[next.key].label}* — how much time did you spend?\nReply in *HH:MM* format`
        );
      }

      delete sess.awaitingTime;
      return sendMessage(from, `✅ All learning times recorded!\n\nReply *report* anytime to see your dashboard.`);
    }
    return sendMessage(from, `Please reply in *HH:MM* format (e.g. *1:30*)`);
  }

  // ── 2. Keyword routing ───────────────────────────────────────
  const intent = detectIntent(lower);

  switch (intent.type) {
    case 'RESET':
      sess.resetFlow = { step: 'choose' };
      return sendMessage(from, resetMenuText());

    case 'HELP':
      return sendMessage(from, helpText());

    case 'REPORT':
      return handleReport(from);

    case 'WEEKLY':
      return handleWeekly(from);

    case 'MTD':
      return handleMTD(from);

    case 'CONSOLIDATED':
      return handleConsolidated(from);

    case 'TASK_DONE': {
      const { taskKey } = intent;
      const task   = TASKS[taskKey];
      const today  = await getTodayRecord(from);
      today.done   = today.done || {};
      today.done[taskKey] = true;
      today.xp     = (today.xp || 0) + task.xp;
      await upsertRecord(from, today);

      if (task.category === 'learning') {
        sess.awaitingTime = { taskKey, pendingTasks: [{ key: taskKey }] };
        return sendMessage(from,
          `✅ *${task.label}* marked complete! *+${task.xp} XP*\n\n` +
          `⏱ How much time did you spend?\nReply in *HH:MM* format (e.g. *1:30*)`
        );
      }
      return sendMessage(from,
        `✅ *${task.label}* — done! *+${task.xp} XP*\nDay total: *${today.xp} XP* 🎯`
      );
    }

    case 'TASK_UNDONE': {
      const { taskKey } = intent;
      const task  = TASKS[taskKey];
      const today = await getTodayRecord(from);
      today.done  = today.done || {};
      if (today.done[taskKey]) {
        delete today.done[taskKey];
        today.xp = (today.xp || 0) - task.xp;
        if (task.category === 'learning') {
          delete (today.learning_times || {})[taskKey];
        }
        await upsertRecord(from, today);
        return sendMessage(from, `↩️ *${task.label}* unmarked. *-${task.xp} XP*`);
      }
      return sendMessage(from, `*${task.label}* wasn't marked done yet.`);
    }

    case 'REGRET_YES': {
      const { regretKey } = intent;
      const regret = REGRETS[regretKey];
      const today  = await getTodayRecord(from);
      today.regrets = today.regrets || {};
      today.regrets[regretKey] = true;
      today.xp = (today.xp || 0) + regret.xp;   // xp is negative
      await upsertRecord(from, today);
      return sendMessage(from,
        `😔 *${regret.label}* noted. *${regret.xp} XP*\nDay total: *${today.xp} XP*`
      );
    }

    case 'REGRET_NO': {
      const { regretKey } = intent;
      const regret = REGRETS[regretKey];
      const today  = await getTodayRecord(from);
      today.regrets = today.regrets || {};
      today.regrets[regretKey] = false;
      await upsertRecord(from, today);
      return sendMessage(from, `👍 No *${regret.label}* today. Stay strong!`);
    }

    case 'BULK_DONE': {
      // e.g. "done workout hydration sleep"
      const { taskKeys } = intent;
      const today = await getTodayRecord(from);
      today.done  = today.done || {};
      let earned  = 0;
      const learningPending = [];
      for (const k of taskKeys) {
        const t = TASKS[k];
        today.done[k] = true;
        today.xp = (today.xp || 0) + t.xp;
        earned  += t.xp;
        if (t.category === 'learning') learningPending.push({ key: k });
      }
      await upsertRecord(from, today);

      if (learningPending.length > 0) {
        sess.awaitingTime = { taskKey: learningPending[0].key, pendingTasks: learningPending };
        const labels = taskKeys.map(k => TASKS[k].label).join(', ');
        return sendMessage(from,
          `✅ Marked: *${labels}*  +${earned} XP\n\n` +
          `⏱ *${TASKS[learningPending[0].key].label}* — how long did you practise?\nReply *HH:MM*`
        );
      }
      const labels = taskKeys.map(k => TASKS[k].label).join(', ');
      return sendMessage(from,
        `✅ Marked done: *${labels}*\n*+${earned} XP*  |  Day total: *${today.xp} XP* 🎯`
      );
    }

    case 'XP':
      return handleXP(from);

    case 'TASKS_LIST':
      return sendMessage(from, taskListText());

    default:
      return sendMessage(from,
        `I didn't quite catch that.\nReply *help* to see all commands, or *tasks* for the full task list.`
      );
  }
}

// ── Intent detection (dynamic / fuzzy) ───────────────────────
function detectIntent(lower) {
  if (/\b(help|\?|menu|commands|what can)\b/.test(lower))      return { type: 'HELP' };
  if (/\b(report|dashboard|status|how am i|score)\b/.test(lower)) return { type: 'REPORT' };
  if (/\b(weekly|week report|this week)\b/.test(lower))        return { type: 'WEEKLY' };
  if (/\b(mtd|month till|month to date)\b/.test(lower))        return { type: 'MTD' };
  if (/\b(consolidated|full report|all time|history)\b/.test(lower)) return { type: 'CONSOLIDATED' };
  if (/\b(xp|points|my xp|today.?s xp)\b/.test(lower))        return { type: 'XP' };
  if (/\b(tasks|task list|all tasks|show tasks)\b/.test(lower)) return { type: 'TASKS_LIST' };
  if (/\b(reset|wipe|clear data|clear all)\b/.test(lower))     return { type: 'RESET' };

  // Regret — "yes guilt" / "guilt yes" / "had guilt" / "i shouted"
  for (const [key, r] of Object.entries(REGRETS)) {
    if (lower.includes(key) || r.aliases.some(a => lower.includes(a))) {
      const isNo = /\b(no|didn.?t|did not|nope|false|not today)\b/.test(lower);
      return isNo
        ? { type: 'REGRET_NO',  regretKey: key }
        : { type: 'REGRET_YES', regretKey: key };
    }
  }

  // Undo — "undo workout" / "unmark sleep" / "remove hydration"
  const undoRe = /\b(undo|unmark|remove|delete|cancel|revert)\b/;
  if (undoRe.test(lower)) {
    for (const key of Object.keys(TASKS)) {
      if (lower.includes(key) || TASKS[key].aliases.some(a => lower.includes(a)))
        return { type: 'TASK_UNDONE', taskKey: key };
    }
  }

  // Bulk done — "done workout hydration sleep cold shower"
  const doneRe = /\b(done|complete[d]?|finished?|did|logged?|mark)\b/;
  if (doneRe.test(lower)) {
    const found = [];
    for (const [key, t] of Object.entries(TASKS)) {
      if (lower.includes(key) || t.aliases.some(a => lower.includes(a)))
        found.push(key);
    }
    if (found.length > 1) return { type: 'BULK_DONE', taskKeys: found };
    if (found.length === 1) return { type: 'TASK_DONE', taskKey: found[0] };
  }

  // Solo task mention without "done" prefix (e.g. "workout ✅" or "gym done")
  for (const [key, t] of Object.entries(TASKS)) {
    if (lower.includes(key) || t.aliases.some(a => lower.includes(a))) {
      const isNeg = /\b(no|skip|didn.?t|not|missed?)\b/.test(lower);
      return isNeg
        ? { type: 'TASK_UNDONE', taskKey: key }
        : { type: 'TASK_DONE',   taskKey: key };
    }
  }

  return { type: 'UNKNOWN' };
}

// ── Report helpers ────────────────────────────────────────────
async function handleReport(from) {
  const today = await getTodayRecord(from);
  const text  = buildDashboard(today);
  return sendMessage(from, text);
}

async function handleXP(from) {
  const today = await getTodayRecord(from);
  return sendMessage(from, `⚡ Today's XP: *${today.xp || 0} XP*`);
}

async function handleWeekly(from) {
  const now   = new Date();
  const start = new Date(now); start.setDate(now.getDate() - now.getDay() + 1); // Mon
  start.setHours(0,0,0,0);
  const rows = await getRange(from, start, now);
  const buf  = await generateExcel(rows, 'Weekly Report');
  return sendFile(from, buf, 'weekly_report.xlsx', 'Weekly XP Report');
}

async function handleMTD(from) {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const rows  = await getRange(from, start, now);
  const buf   = await generateExcel(rows, `MTD Report — ${now.toLocaleString('default',{month:'long'})} ${now.getFullYear()}`);
  return sendFile(from, buf, 'mtd_report.xlsx', 'MTD XP Report');
}

async function handleConsolidated(from) {
  const rows = await getRange(from, new Date('2024-01-01'), new Date());
  const buf  = await generateExcel(rows, 'Consolidated Report — All Time');
  return sendFile(from, buf, 'consolidated_report.xlsx', 'Full Consolidated XP Report');
}

// ── Static text helpers ───────────────────────────────────────
function helpText() {
  return `🤖 *DailyXP Bot — Commands*

*Logging tasks (just say it naturally):*
• _workout done_ / _did gym_ / _logged workout_
• _reading complete_ / _done speaking_
• _hydration_ / _3l water done_
• _done workout hydration sleep_ _(bulk)_

*Regrets:*
• _guilt yes_ / _i shouted_ / _had guilt today_
• _no unnecessary expenses_

*Reports:*
• *report* — today's dashboard
• *weekly* — weekly Excel
• *mtd* — month-to-date Excel
• *consolidated* — all-time Excel
• *xp* — quick XP check
• *tasks* — full task list

*Undo:* _undo workout_ / _remove sleep_`;
}

function taskListText() {
  let msg = `📋 *All Tasks & XP*\n\n`;
  const cats = { health:'💪 Physical Health', learning:'📚 Learning', finance:'💰 Finance' };
  for (const [cat, label] of Object.entries(cats)) {
    msg += `*${label}*\n`;
    for (const [k,t] of Object.entries(TASKS)) {
      if (t.category === cat) msg += `  • ${t.label} — *+${t.xp} XP*\n`;
    }
    msg += '\n';
  }
  msg += `*😔 Regrets*\n`;
  for (const [k,r] of Object.entries(REGRETS))
    msg += `  • ${r.label} — *${r.xp} XP*\n`;
  return msg;
}

async function handleResetFlow(from, text, lower, sess) {
  const flow = sess.resetFlow;

  if (flow.step === 'choose') {
    if (lower === '1' || /\b(day|today)\b/.test(lower)) {
      await deleteTodayRecord(from);
      delete sess.resetFlow;
      return sendMessage(from, `✅ Today's data has been reset.`);
    }

    if (lower === '2' || /\b(particular|specific|date)\b/.test(lower)) {
      flow.step = 'awaiting_date';
      return sendMessage(from, `Send the date you want to reset in *DD/MM/YYYY* format, for example *20/05/2026*.`);
    }

    if (lower === '3' || /\b(everything|all)\b/.test(lower)) {
      flow.step = 'awaiting_all_confirm';
      return sendMessage(from, `This will delete *all* your saved data.\nReply *YES* to continue or *NO* to cancel.`);
    }

    return sendMessage(from, resetMenuText());
  }

  if (flow.step === 'awaiting_date') {
    const parsed = parseDdMmYyyy(text);
    if (!parsed) {
      return sendMessage(from, `Please send the date in *DD/MM/YYYY* format, for example *20/05/2026*.`);
    }

    await deleteRecord(from, parsed.firestoreDate);
    delete sess.resetFlow;
    return sendMessage(from, `✅ Data for *${parsed.displayDate}* has been reset.`);
  }

  if (flow.step === 'awaiting_all_confirm') {
    if (/^(yes|y|confirm)$/i.test(lower)) {
      await deleteAllRecords(from);
      delete sess.resetFlow;
      return sendMessage(from, `✅ All your saved data has been reset.`);
    }

    if (/^(no|n|cancel)$/i.test(lower)) {
      delete sess.resetFlow;
      return sendMessage(from, `Reset cancelled.`);
    }

    return sendMessage(from, `Reply *YES* to delete everything or *NO* to cancel.`);
  }

  delete sess.resetFlow;
  return sendMessage(from, `Reset cancelled.`);
}

function resetMenuText() {
  return `♻️ *Reset Options*

1. Reset for the day
2. Reset for particular date
3. Reset everything

Reply with *1*, *2*, or *3*.`;
}

function parseDdMmYyyy(text) {
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    firestoreDate: `${yyyy}-${mm}-${dd}`,
    displayDate: `${dd}/${mm}/${yyyy}`
  };
}

module.exports = { handleMessage };
