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
  }
};

// Utility: normalize text for matching
function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

module.exports = { TASKS, REGRETS, normalize };
