// scripts/test_dashboard.js
// Run: node scripts/test_dashboard.js
// Prints sample dashboard output to terminal

const { buildDashboard } = require('./dashboard');

const sample = {
  date: '2025-05-19',
  xp: 75,
  done: {
    workout:   true,
    hydration: true,
    sleep:     true,
    reading:   true,
    speaking:  true,
    portfolio: true
  },
  regrets: {
    guilt:    false,
    shouted:  false,
    assault:  false,
    expenses: true
  },
  learning_times: {
    reading:  '0:45',
    speaking: '1:00'
  }
};

console.log('── Dashboard Output ──────────────────────────────');
console.log(buildDashboard(sample, 'End-of-Day Report'));
console.log('──────────────────────────────────────────────────');
