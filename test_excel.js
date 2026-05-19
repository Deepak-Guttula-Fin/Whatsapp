// scripts/test_excel.js
// Run: node scripts/test_excel.js
// Generates a sample Excel file at ./test_output.xlsx

const { generateExcel } = require('./excel');
const fs = require('fs');
const path = require('path');

const sampleData = [
  {
    date: '2025-05-12',
    xp: 75,
    done: { workout:true, hydration:true, sleep:true, reading:true, speaking:true },
    regrets: { guilt:false, shouted:false, assault:false, expenses:false },
    learning_times: { reading:'0:45', speaking:'1:00' }
  },
  {
    date: '2025-05-13',
    xp: 55,
    done: { workout:false, hydration:true, sleep:true, shower:true, writing:true, portfolio:true },
    regrets: { guilt:true, shouted:false, assault:false, expenses:false },
    learning_times: { writing:'1:30' }
  },
  {
    date: '2025-05-14',
    xp: 95,
    done: { workout:true, hydration:true, sleep:true, shower:true, eating:true, reading:true, speaking:true, writing:true, listening:true, portfolio:true, economic:true },
    regrets: { guilt:false, shouted:false, assault:false, expenses:false },
    learning_times: { reading:'0:30', speaking:'0:45', writing:'1:00', listening:'0:30' }
  },
  {
    date: '2025-05-15',
    xp: 30,
    done: { hydration:true, sleep:true, listening:true },
    regrets: { guilt:false, shouted:true, assault:false, expenses:true },
    learning_times: { listening:'0:45' }
  },
  {
    date: '2025-05-16',
    xp: 65,
    done: { workout:true, hydration:true, sleep:true, reading:true, portfolio:true, economic:true },
    regrets: { guilt:false, shouted:false, assault:false, expenses:false },
    learning_times: { reading:'1:15' }
  }
];

(async () => {
  console.log('Generating test Excel...');
  const buf = await generateExcel(sampleData, 'Test Weekly Report — May 12–16, 2025');
  const out = path.join(__dirname, 'test_output.xlsx');
  fs.writeFileSync(out, buf);
  console.log(`✅ Saved to ${out}`);
})();
