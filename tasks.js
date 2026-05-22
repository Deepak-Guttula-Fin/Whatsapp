// ============================================================
//  tasks.js  —  Single source of truth for all tasks & regrets
// ============================================================

const TASKS = {
  // ── Physical Health ─────────────────────────────────────
  workout: {
    label:    'Workout / Gym',
    category: 'health',
    xp:       20,
    aliases:  ['gym', 'exercise', 'training', 'lifted', 'lift', 'worked out']
  },
  hydration: {
    label:    'Hydration (3L)',
    category: 'health',
    xp:       10,
    aliases:  ['water', '3l', 'hydrate', 'drank water', '3 litre', '3 liter']
  },
  sleep: {
    label:    'Sleep (7–8h)',
    category: 'health',
    xp:       10,
    aliases:  ['slept', 'sleeping', '7h', '8h', 'good sleep', 'full sleep']
  },
  shower: {
    label:    'Cold Shower',
    category: 'health',
    xp:       15,
    aliases:  ['cold shower', 'cold bath', 'cold water shower', 'ice shower']
  },
  eating: {
    label:    'Healthy Eating',
    category: 'health',
    xp:       10,
    aliases:  ['healthy food', 'clean eating', 'diet', 'ate healthy', 'good food', 'nutrition']
  },
  hygiene: {
    label:    'Personal Hygiene',
    category: 'health',
    xp:       20,
    aliases:  ['hygiene', 'personal care', 'self care', 'grooming', 'personal hygiene']
  },

  // ── Learning ─────────────────────────────────────────────
  reading: {
    label:    'Reading Practice',
    category: 'learning',
    xp:       15,
    aliases:  ['read', 'reads', 'book', 'article', 'reading session']
  },
  speaking: {
    label:    'Speaking Practice',
    category: 'learning',
    xp:       20,
    aliases:  ['speak', 'spoke', 'speech', 'conversation practice', 'talking practice']
  },
  writing: {
    label:    'Writing Practice',
    category: 'learning',
    xp:       20,
    aliases:  ['write', 'wrote', 'journal', 'writing session', 'essay']
  },
  listening: {
    label:    'Listening Practice',
    category: 'learning',
    xp:       15,
    aliases:  ['listen', 'listened', 'podcast', 'audio', 'listening session']
  },
  notes_revision: {
    label:    'Notes Revision',
    category: 'learning',
    xp:       10,
    aliases:  ['revise notes', 'notes review', 'review notes', 'revision']
  },
  financial_concept: {
    label:    'Learn One Financial Concept',
    category: 'learning',
    xp:       20,
    aliases:  ['financial concept', 'learn finance', 'learn one finance concept', 'finance concept']
  },

  // ── Finance ──────────────────────────────────────────────
  portfolio: {
    label:    'Portfolio Review',
    category: 'finance',
    xp:       10,
    aliases:  ['stocks', 'investments', 'portfolio check', 'reviewed portfolio', 'market check']
  },
  economic: {
    label:    'Economic Updates',
    category: 'finance',
    xp:       15,
    aliases:  ['economics', 'economy', 'news', 'financial news', 'market news', 'economic update']
  },

  // â”€â”€ Weekend Exploration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  weekend_exploration: {
    label:    'Explore Something New',
    category: 'bonus',
    xp:       30,
    weekendOnly: true,
    aliases:  ['explore', 'explore new', 'weekend exploration', 'bonus challenge', 'something new']
  }
};

const REGRETS = {
  guilt: {
    label:   'Guilt',
    xp:      -10,
    aliases: ['felt guilty', 'guilty', 'regret']
  },
  shouted: {
    label:   'Shouted',
    xp:      -20,
    aliases: ['yelled', 'screamed', 'raised voice', 'shouting', 'yelling']
  },
  assault: {
    label:   'Physical Assault',
    xp:      -30,
    aliases: ['hit', 'punched', 'physical', 'violence', 'attacked', 'pushed']
  },
  expenses: {
    label:   'Unnecessary Expenses',
    xp:      -20,
    aliases: ['overspent', 'wasted money', 'impulse buy', 'unnecessary spending', 'useless purchase']
  },
  instagram: {
    label:   'Instagram Usage Above 2 Hours',
    xp:      -10,
    aliases: ['instagram', 'too much instagram', 'social media', 'scrolling instagram']
  },
  junk_food: {
    label:   'Junk Food Consumption',
    xp:      -15,
    aliases: ['junk food', 'fast food', 'unhealthy snacks', 'eating junk']
  },
  missed_task: {
    label:   'Missed Important Task',
    xp:      -20,
    aliases: ['missed task', 'important task missed', 'skipped task', 'forgot important task']
  }
};

// Utility: normalize text for matching
function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

function isWeekend(date = new Date()) {
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short'
  }).format(date);
  return day === 'Sat' || day === 'Sun';
}

function getVisibleTaskEntries(date = new Date()) {
  return Object.entries(TASKS).filter(([, task]) => {
    if (!task.weekendOnly) return true;
    return isWeekend(date);
  });
}

function getTaskSections(date = new Date()) {
  const entries = getVisibleTaskEntries(date);
  const order = [
    { category: 'health', label: '💪 Physical Health' },
    { category: 'learning', label: '📚 Learning' },
    { category: 'finance', label: '💰 Finance' },
    { category: 'bonus', label: '🌍 Weekend Exploration - Weekly Bonus Challenge' }
  ];

  return order
    .map(section => ({
      ...section,
      tasks: entries.filter(([, task]) => task.category === section.category)
    }))
    .filter(section => section.tasks.length > 0);
}

module.exports = { TASKS, REGRETS, normalize, isWeekend, getVisibleTaskEntries, getTaskSections };
