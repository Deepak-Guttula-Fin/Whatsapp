// ============================================================
//  dashboard.js  —  Builds the WhatsApp text dashboard
//  Format:  MMM, DD-YYYY HH:MM AM/PM
// ============================================================

const { TASKS, REGRETS } = require('./tasks');

function buildDashboard(record, label) {
  const now    = new Date();
  const dt     = formatDateTime(now);
  const xp     = record.xp || 0;
  const done   = record.done    || {};
  const regrets = record.regrets || {};
  const times  = record.learning_times || {};

  // Group tasks by category
  const categories = {
    health:   { label: '💪 Physical Health',  tasks: [] },
    learning: { label: '📚 Learning',          tasks: [] },
    finance:  { label: '💰 Finance',           tasks: [] }
  };
  const unachieved = {
    health:   { label: '💪 Physical Health',  tasks: [] },
    learning: { label: '📚 Learning',          tasks: [] },
    finance:  { label: '💰 Finance',           tasks: [] }
  };

  for (const [key, task] of Object.entries(TASKS)) {
    const cat = task.category;
    if (done[key]) {
      let line = `  • ${task.label} — *(+${task.xp} XP)*`;
      if (task.category === 'learning' && times[key])
        line += ` ⏱ ${times[key]}`;
      categories[cat].tasks.push(line);
    } else {
      unachieved[cat].tasks.push(`  • ${task.label}`);
    }
  }

  let msg = `📅 *${dt}*\n`;
  msg    += `━━━━━━━━━━━━━━━━━━\n`;
  msg    += `⚡ *Score: ${xp >= 0 ? '+' : ''}${xp} XP*\n`;
  msg    += `━━━━━━━━━━━━━━━━━━\n\n`;

  // ── Achieved ──────────────────────────────────────────────
  const hasAchieved = Object.values(categories).some(c => c.tasks.length > 0);
  if (hasAchieved) {
    msg += `✅ *Achieved Tasks*\n`;
    for (const cat of Object.values(categories)) {
      if (cat.tasks.length === 0) continue;
      msg += `\n*${cat.label}*\n`;
      msg += cat.tasks.join('\n') + '\n';
    }
  } else {
    msg += `✅ *Achieved Tasks*\n  _(none yet)_\n`;
  }

  msg += `\n`;

  // ── Unachieved ────────────────────────────────────────────
  const hasUnachieved = Object.values(unachieved).some(c => c.tasks.length > 0);
  if (hasUnachieved) {
    msg += `❌ *Unachieved Tasks*\n`;
    for (const cat of Object.values(unachieved)) {
      if (cat.tasks.length === 0) continue;
      msg += `\n*${cat.label}*\n`;
      msg += cat.tasks.join('\n') + '\n';
    }
  } else {
    msg += `❌ *Unachieved Tasks*\n  _(all done! 🔥)_\n`;
  }

  msg += `\n`;

  // ── Regrets ───────────────────────────────────────────────
  msg += `😔 *Regrets*\n`;
  for (const [key, regret] of Object.entries(REGRETS)) {
    const val = regrets[key];
    if (val === true)
      msg += `  • ${regret.label} — *Yes* _(${regret.xp} XP)_\n`;
    else if (val === false)
      msg += `  • ${regret.label} — No\n`;
    else
      msg += `  • ${regret.label} — _not recorded_\n`;
  }

  if (label) {
    msg = `📊 *${label}*\n` + msg;
  }

  return msg;
}

function formatDateTime(date) {
  // MMM, DD-YYYY HH:MM AM/PM
  const months = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];
  const mon  = months[date.getMonth()];
  const dd   = String(date.getDate()).padStart(2,'0');
  const yyyy = date.getFullYear();
  let h      = date.getHours();
  const m    = String(date.getMinutes()).padStart(2,'0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h          = h % 12 || 12;
  return `${mon}, ${dd}-${yyyy} ${h}:${m} ${ampm}`;
}

module.exports = { buildDashboard, formatDateTime };
