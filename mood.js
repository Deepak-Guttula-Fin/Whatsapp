const { Markup } = require('telegraf');

const MOOD_OPTIONS = {
  excellent: {
    key: 'excellent',
    emoji: '😄',
    label: 'Excellent',
    score: 5
  },
  happy: {
    key: 'happy',
    emoji: '😊',
    label: 'Happy',
    score: 4
  },
  good: {
    key: 'good',
    emoji: '🙂',
    label: 'Good',
    score: 3
  },
  neutral: {
    key: 'neutral',
    emoji: '😐',
    label: 'Neutral',
    score: 2
  },
  tired: {
    key: 'tired',
    emoji: '😴',
    label: 'Tired',
    score: 1
  },
  low: {
    key: 'low',
    emoji: '😔',
    label: 'Low',
    score: 0
  },
  stressed: {
    key: 'stressed',
    emoji: '😣',
    label: 'Stressed',
    score: -1
  },
  bored: {
    key: 'bored',
    emoji: '😒',
    label: 'Bored',
    score: -2
  },
  irritated: {
    key: 'irritated',
    emoji: '😡',
    label: 'Irritated',
    score: -3
  },
  frustrated: {
    key: 'frustrated',
    emoji: '🤯',
    label: 'Frustrated',
    score: -4
  }
};

const MOOD_SLOTS = [
  { key: '1000', label: '10:00 AM', hour: 10, minute: 0 },
  { key: '1400', label: '2:00 PM', hour: 14, minute: 0 },
  { key: '1600', label: '4:00 PM', hour: 16, minute: 0 },
  { key: '1800', label: '6:00 PM', hour: 18, minute: 0 },
  { key: '2200', label: '10:00 PM', hour: 22, minute: 0 }
];

function getMoodOptions() {
  return Object.values(MOOD_OPTIONS);
}

function getMoodOption(key) {
  return MOOD_OPTIONS[key] || null;
}

function getMoodSlot(key) {
  return MOOD_SLOTS.find(slot => slot.key === key) || null;
}

function getMoodSlots() {
  return MOOD_SLOTS.slice();
}

function getIstDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function getIstDateLabel(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${map.day} ${map.month} ${map.year}`;
}

function moodScoreLabel(score) {
  if (score > 0) return `+${score}`;
  return String(score);
}

function formatMoodChoice(option) {
  return `${option.emoji} ${option.label} (${moodScoreLabel(option.score)})`;
}

function buildMoodPrompt(slotKey) {
  const slot = getMoodSlot(slotKey);
  if (!slot) {
    throw new Error(`Unknown mood slot: ${slotKey}`);
  }

  const rows = [];
  const options = getMoodOptions();
  for (let i = 0; i < options.length; i += 2) {
    const row = [];
    const first = options[i];
    row.push(Markup.button.callback(formatMoodChoice(first), `mood:${slot.key}:${first.key}`));
    if (options[i + 1]) {
      const second = options[i + 1];
      row.push(Markup.button.callback(formatMoodChoice(second), `mood:${slot.key}:${second.key}`));
    }
    rows.push(row);
  }

  return {
    slot,
    text: [
      `📊 *Mood Check-in* — *${slot.label}*`,
      '',
      'How are you feeling right now?',
      'Tap one mood below and I will save it for today.'
    ].join('\n'),
    keyboard: Markup.inlineKeyboard(rows)
  };
}

function buildMoodSavedText(slot, mood, dateKey, average = null) {
  const avgText = average === null || average === undefined
    ? ''
    : `\nToday\'s average mood score: *${average}*`;

  return [
    `✅ *Mood saved*`,
    '',
    `*${slot.label}* — ${formatMoodChoice(mood)}`,
    `Date: *${formatDisplayDate(dateKey)}*`,
    avgText
  ].filter(Boolean).join('\n');
}

function formatDisplayDate(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(day).padStart(2, '0')} ${months[month - 1]} ${year}`;
}

module.exports = {
  MOOD_OPTIONS,
  MOOD_SLOTS,
  getMoodOptions,
  getMoodOption,
  getMoodSlot,
  getMoodSlots,
  getIstDateKey,
  getIstDateLabel,
  moodScoreLabel,
  formatMoodChoice,
  buildMoodPrompt,
  buildMoodSavedText,
  formatDisplayDate
};
