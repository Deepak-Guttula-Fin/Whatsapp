// ============================================================
//  excel.js  —  Generates Excel reports
//  Columns = Dates | Rows = Tasks | Last row = Total XP
//  Learning tasks show HH:MM (time spent)
// ============================================================

const ExcelJS = require('exceljs');
const { TASKS, REGRETS } = require('./tasks');

async function generateExcel(records, title) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DailyXP Bot';
  wb.created = new Date();

  const ws = wb.addWorksheet(title.substring(0, 31), {
    pageSetup: { paperSize: 9, orientation: 'landscape' }
  });

  // ── Palette ──────────────────────────────────────────────
  const CLR = {
    headerBg:    '1A1A2E',  headerFg: 'FFFFFF',
    healthBg:    'E8F5E9',  healthFg: '1B5E20',
    learningBg:  'E3F2FD',  learningFg: '0D47A1',
    financeBg:   'FFF8E1',  financeFg:  'F57F17',
    regretBg:    'FCE4EC',  regretFg:   'B71C1C',
    doneBg:      'C8E6C9',  doneFg:     '256029',
    missBg:      'FFCDD2',  missFg:     'B71C1C',
    timeBg:      'E1F5FE',  timeFg:     '01579B',
    totalBg:     '37474F',  totalFg:    'FFFFFF',
    separatorBg: 'CFD8DC',
  };

  const thin = { style: 'thin', color: { argb: 'BDBDBD' } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };

  function fill(argb) {
    return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
  }
  function font(argb, bold = false, size = 10) {
    return { name: 'Calibri', size, bold, color: { argb } };
  }
  function align(h = 'center', v = 'middle') {
    return { horizontal: h, vertical: v, wrapText: true };
  }

  // ── Sort records by date ─────────────────────────────────
  records.sort((a, b) => new Date(a.date) - new Date(b.date));

  // ── Column definitions ──────────────────────────────────
  const dateCols = records.map(r => ({
    header: formatColDate(r.date),
    key:    r.date,
    width:  12
  }));

  ws.columns = [
    { header: 'Category',        key: 'category', width: 16 },
    { header: 'Task',            key: 'task',     width: 26 },
    { header: 'XP Value',        key: 'xpval',    width: 10 },
    ...dateCols
  ];

  // ── Title row ────────────────────────────────────────────
  ws.spliceRows(1, 0, []);   // insert blank row 1 for title
  const totalCols = 3 + dateCols.length;
  ws.mergeCells(1, 1, 1, totalCols);
  const titleCell = ws.getCell('A1');
  titleCell.value = title;
  titleCell.font  = font('FFFFFF', true, 14);
  titleCell.fill  = fill(CLR.headerBg);
  titleCell.alignment = align('center');
  ws.getRow(1).height = 28;

  // ── Header row (row 2) ────────────────────────────────────
  ws.spliceRows(2, 0, []);
  const headerRow = ws.getRow(2);
  headerRow.height = 22;
  const headerVals = ['Category', 'Task', 'XP', ...records.map(r => formatColDate(r.date))];
  headerVals.forEach((v, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = v;
    cell.font  = font('FFFFFF', true, 10);
    cell.fill  = fill(CLR.headerBg);
    cell.alignment = align('center');
    cell.border = border;
  });

  // ── Task rows ────────────────────────────────────────────
  let rowIdx = 3;

  // Category groups
  const groups = [
    { name: '💪 Physical Health', cat: 'health',   bg: CLR.healthBg,   fg: CLR.healthFg   },
    { name: '📚 Learning',        cat: 'learning',  bg: CLR.learningBg, fg: CLR.learningFg },
    { name: '💰 Finance',         cat: 'finance',   bg: CLR.financeBg,  fg: CLR.financeFg  },
    { name: '😔 Regrets',         cat: 'regret',    bg: CLR.regretBg,   fg: CLR.regretFg   },
  ];

  for (const group of groups) {
    // Category label row
    const catRow = ws.getRow(rowIdx++);
    catRow.height = 18;
    ws.mergeCells(catRow.number, 1, catRow.number, 3);
    const catCell = catRow.getCell(1);
    catCell.value     = group.name;
    catCell.font      = font(group.fg, true, 10);
    catCell.fill      = fill(group.bg);
    catCell.alignment = align('left');
    catCell.border    = border;
    // fill date cells in category row
    for (let c = 4; c <= totalCols; c++) {
      const cc = catRow.getCell(c);
      cc.fill   = fill(CLR.separatorBg);
      cc.border = border;
    }

    // Task rows
    const taskEntries = group.cat === 'regret'
      ? Object.entries(REGRETS)
      : Object.entries(TASKS).filter(([,t]) => t.category === group.cat);

    for (const [key, task] of taskEntries) {
      const row = ws.getRow(rowIdx++);
      row.height = 16;

      // Category cell (merged into just this row)
      const catC = row.getCell(1);
      catC.value     = '';
      catC.fill      = fill(group.bg);
      catC.border    = border;

      // Task label
      const taskC = row.getCell(2);
      taskC.value     = task.label;
      taskC.font      = font('263238', false, 10);
      taskC.fill      = fill('FAFAFA');
      taskC.alignment = align('left');
      taskC.border    = border;

      // XP value
      const xpC = row.getCell(3);
      xpC.value     = group.cat === 'regret' ? task.xp : `+${task.xp}`;
      xpC.font      = font(group.cat === 'regret' ? CLR.regretFg : CLR.doneFg, true, 10);
      xpC.alignment = align('center');
      xpC.border    = border;

      // Data cells (one per date)
      records.forEach((rec, ci) => {
        const cell = row.getCell(4 + ci);
        cell.border = border;

        if (group.cat === 'regret') {
          const val = (rec.regrets || {})[key];
          if (val === true) {
            cell.value     = `Yes (${task.xp} XP)`;
            cell.font      = font(CLR.regretFg, true, 9);
            cell.fill      = fill(CLR.missBg);
          } else if (val === false) {
            cell.value     = 'No';
            cell.font      = font(CLR.doneFg, false, 9);
            cell.fill      = fill(CLR.doneBg);
          } else {
            cell.value     = '–';
            cell.font      = font('9E9E9E', false, 9);
          }
        } else if (task.category === 'learning') {
          const timeVal = (rec.learning_times || {})[key];
          const isDone  = (rec.done || {})[key];
          if (isDone && timeVal) {
            cell.value     = timeVal;
            cell.font      = font(CLR.timeFg, true, 9);
            cell.fill      = fill(CLR.timeBg);
          } else if (isDone) {
            cell.value     = '✓';
            cell.font      = font(CLR.doneFg, true, 10);
            cell.fill      = fill(CLR.doneBg);
          } else {
            cell.value     = '✗';
            cell.font      = font(CLR.missFg, false, 10);
            cell.fill      = fill(CLR.missBg);
          }
        } else {
          const isDone = (rec.done || {})[key];
          cell.value     = isDone ? '✓' : '✗';
          cell.font      = font(isDone ? CLR.doneFg : CLR.missFg, isDone, 10);
          cell.fill      = fill(isDone ? CLR.doneBg : CLR.missBg);
        }
        cell.alignment = align('center');
      });
    }
  }

  // ── Total XP row ─────────────────────────────────────────
  const totalRow = ws.getRow(rowIdx);
  totalRow.height = 22;
  ws.mergeCells(rowIdx, 1, rowIdx, 3);
  const totLbl = totalRow.getCell(1);
  totLbl.value     = '⚡ Total XP';
  totLbl.font      = font(CLR.totalFg, true, 11);
  totLbl.fill      = fill(CLR.totalBg);
  totLbl.alignment = align('center');
  totLbl.border    = border;

  records.forEach((rec, ci) => {
    const cell = totalRow.getCell(4 + ci);
    const xp   = rec.xp || 0;
    cell.value     = xp >= 0 ? `+${xp}` : `${xp}`;
    cell.font      = font(xp >= 0 ? 'A5D6A7' : 'EF9A9A', true, 11);
    cell.fill      = fill(CLR.totalBg);
    cell.alignment = align('center');
    cell.border    = border;
  });

  // ── Freeze header columns ────────────────────────────────
  ws.views = [{ state: 'frozen', xSplit: 3, ySplit: 2 }];

  // ── Return as buffer ─────────────────────────────────────
  const buf = await wb.xlsx.writeBuffer();
  return buf;
}

function formatColDate(dateStr) {
  const d = new Date(dateStr);
  const days  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months= ['Jan','Feb','Mar','Apr','May','Jun',
                 'Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[d.getDay()]}\n${d.getDate()} ${months[d.getMonth()]}`;
}

module.exports = { generateExcel };
