// ============================================================
//  excel.js  -  Generates Excel reports
//  Task sheet: Columns = Dates | Rows = Tasks | Last row = Total XP
//  Mood sheet: Columns = Dates | Rows = Time | Last row = Average Mood
// ============================================================

const ExcelJS = require('exceljs');
const { TASKS, REGRETS } = require('./tasks');
const { getMoodSlots, formatMoodChoice } = require('./mood');

async function generateExcel(records, title, options = {}) {
  const taskRecords = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
  const moodRecords = [...(options.moodRecords || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

  const wb = new ExcelJS.Workbook();
  wb.creator = 'DailyXP Bot';
  wb.created = new Date();

  addTaskSheet(wb, taskRecords, title);
  addMoodSheet(wb, moodRecords, title);

  const buf = await wb.xlsx.writeBuffer();
  return buf;
}

function addTaskSheet(wb, records, title) {
  const ws = wb.addWorksheet(title.substring(0, 31), {
    pageSetup: { paperSize: 9, orientation: 'landscape' }
  });

  const CLR = {
    headerBg: '1A1A2E',
    headerFg: 'FFFFFF',
    healthBg: 'E8F5E9',
    healthFg: '1B5E20',
    learningBg: 'E3F2FD',
    learningFg: '0D47A1',
    financeBg: 'FFF8E1',
    financeFg: 'F57F17',
    regretBg: 'FCE4EC',
    regretFg: 'B71C1C',
    doneBg: 'C8E6C9',
    doneFg: '256029',
    missBg: 'FFCDD2',
    missFg: 'B71C1C',
    timeBg: 'E1F5FE',
    timeFg: '01579B',
    totalBg: '37474F',
    totalFg: 'FFFFFF',
    separatorBg: 'CFD8DC'
  };

  const thin = { style: 'thin', color: { argb: 'BDBDBD' } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };
  const fill = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
  const font = (argb, bold = false, size = 10) => ({
    name: 'Calibri',
    size,
    bold,
    color: { argb }
  });
  const align = (h = 'center', v = 'middle') => ({ horizontal: h, vertical: v, wrapText: true });

  const dateCols = records.map(record => ({
    header: formatColDate(record.date),
    key: record.date,
    width: 12
  }));

  ws.columns = [
    { header: 'Category', key: 'category', width: 16 },
    { header: 'Task', key: 'task', width: 26 },
    { header: 'XP Value', key: 'xpval', width: 10 },
    ...dateCols
  ];

  ws.spliceRows(1, 0, []);
  const totalCols = 3 + dateCols.length;
  ws.mergeCells(1, 1, 1, totalCols);
  const titleCell = ws.getCell('A1');
  titleCell.value = title;
  titleCell.font = font('FFFFFF', true, 14);
  titleCell.fill = fill(CLR.headerBg);
  titleCell.alignment = align('center');
  ws.getRow(1).height = 28;

  ws.spliceRows(2, 0, []);
  const headerRow = ws.getRow(2);
  headerRow.height = 22;
  const headerVals = ['Category', 'Task', 'XP', ...records.map(r => formatColDate(r.date))];
  headerVals.forEach((value, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = value;
    cell.font = font('FFFFFF', true, 10);
    cell.fill = fill(CLR.headerBg);
    cell.alignment = align('center');
    cell.border = border;
  });

  let rowIdx = 3;
  const groups = [
    { name: '💪 Physical Health', cat: 'health', bg: CLR.healthBg, fg: CLR.healthFg },
    { name: '📚 Learning', cat: 'learning', bg: CLR.learningBg, fg: CLR.learningFg },
    { name: '💰 Finance', cat: 'finance', bg: CLR.financeBg, fg: CLR.financeFg },
    { name: '😔 Regrets', cat: 'regret', bg: CLR.regretBg, fg: CLR.regretFg }
  ];

  for (const group of groups) {
    const catRow = ws.getRow(rowIdx++);
    catRow.height = 18;
    ws.mergeCells(catRow.number, 1, catRow.number, 3);
    const catCell = catRow.getCell(1);
    catCell.value = group.name;
    catCell.font = font(group.fg, true, 10);
    catCell.fill = fill(group.bg);
    catCell.alignment = align('left');
    catCell.border = border;

    for (let c = 4; c <= totalCols; c++) {
      const cc = catRow.getCell(c);
      cc.fill = fill(CLR.separatorBg);
      cc.border = border;
    }

    const taskEntries = group.cat === 'regret'
      ? Object.entries(REGRETS)
      : Object.entries(TASKS).filter(([, task]) => task.category === group.cat);

    for (const [key, task] of taskEntries) {
      const row = ws.getRow(rowIdx++);
      row.height = 16;

      const catC = row.getCell(1);
      catC.value = '';
      catC.fill = fill(group.bg);
      catC.border = border;

      const taskC = row.getCell(2);
      taskC.value = task.label;
      taskC.font = font('263238', false, 10);
      taskC.fill = fill('FAFAFA');
      taskC.alignment = align('left');
      taskC.border = border;

      const xpC = row.getCell(3);
      xpC.value = group.cat === 'regret' ? task.xp : `+${task.xp}`;
      xpC.font = font(group.cat === 'regret' ? CLR.regretFg : CLR.doneFg, true, 10);
      xpC.alignment = align('center');
      xpC.border = border;

      records.forEach((rec, ci) => {
        const cell = row.getCell(4 + ci);
        cell.border = border;
        cell.alignment = align('center');

        if (group.cat === 'regret') {
          const val = (rec.regrets || {})[key];
          if (val === true) {
            cell.value = `Yes (${task.xp} XP)`;
            cell.font = font(CLR.regretFg, true, 9);
            cell.fill = fill(CLR.missBg);
          } else if (val === false) {
            cell.value = 'No';
            cell.font = font(CLR.doneFg, false, 9);
            cell.fill = fill(CLR.doneBg);
          } else {
            cell.value = '—';
            cell.font = font('9E9E9E', false, 9);
          }
          return;
        }

        if (task.category === 'learning') {
          const timeVal = (rec.learning_times || {})[key];
          const isDone = (rec.done || {})[key];
          if (isDone && timeVal) {
            cell.value = timeVal;
            cell.font = font(CLR.timeFg, true, 9);
            cell.fill = fill(CLR.timeBg);
          } else if (isDone) {
            cell.value = '✓';
            cell.font = font(CLR.doneFg, true, 10);
            cell.fill = fill(CLR.doneBg);
          } else {
            cell.value = '✗';
            cell.font = font(CLR.missFg, false, 10);
            cell.fill = fill(CLR.missBg);
          }
          return;
        }

        const isDone = (rec.done || {})[key];
        cell.value = isDone ? '✓' : '✗';
        cell.font = font(isDone ? CLR.doneFg : CLR.missFg, isDone, 10);
        cell.fill = fill(isDone ? CLR.doneBg : CLR.missBg);
      });
    }
  }

  const totalRow = ws.getRow(rowIdx);
  totalRow.height = 22;
  ws.mergeCells(rowIdx, 1, rowIdx, 3);
  const totLbl = totalRow.getCell(1);
  totLbl.value = '⚡ Total XP';
  totLbl.font = font(CLR.totalFg, true, 11);
  totLbl.fill = fill(CLR.totalBg);
  totLbl.alignment = align('center');
  totLbl.border = border;

  records.forEach((rec, ci) => {
    const cell = totalRow.getCell(4 + ci);
    const xp = rec.xp || 0;
    cell.value = xp >= 0 ? `+${xp}` : `${xp}`;
    cell.font = font(xp >= 0 ? 'A5D6A7' : 'EF9A9A', true, 11);
    cell.fill = fill(CLR.totalBg);
    cell.alignment = align('center');
    cell.border = border;
  });

  ws.views = [{ state: 'frozen', xSplit: 3, ySplit: 2 }];
}

function addMoodSheet(wb, moodRecords, title) {
  const ws = wb.addWorksheet('Mood Tracker', {
    pageSetup: { paperSize: 9, orientation: 'landscape' }
  });

  const CLR = {
    headerBg: '1A1A2E',
    headerFg: 'FFFFFF',
    timeBg: 'E3F2FD',
    timeFg: '0D47A1',
    avgBg: '37474F',
    avgFg: 'FFFFFF'
  };

  const thin = { style: 'thin', color: { argb: 'BDBDBD' } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };
  const fill = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
  const font = (argb, bold = false, size = 10) => ({
    name: 'Calibri',
    size,
    bold,
    color: { argb }
  });
  const align = (h = 'center', v = 'middle') => ({ horizontal: h, vertical: v, wrapText: true });

  const dateCols = moodRecords.map(record => ({
    header: formatColDate(record.date),
    key: record.date,
    width: 15
  }));

  ws.columns = [
    { header: 'Time', key: 'time', width: 18 },
    ...dateCols
  ];

  ws.spliceRows(1, 0, []);
  const totalCols = 1 + dateCols.length;
  ws.mergeCells(1, 1, 1, Math.max(totalCols, 1));
  const titleCell = ws.getCell('A1');
  titleCell.value = `${title} — Mood Tracker`;
  titleCell.font = font(CLR.headerFg, true, 14);
  titleCell.fill = fill(CLR.headerBg);
  titleCell.alignment = align('center');
  ws.getRow(1).height = 28;

  ws.spliceRows(2, 0, []);
  const headerRow = ws.getRow(2);
  headerRow.height = 22;
  const headerVals = ['Time', ...moodRecords.map(r => formatColDate(r.date))];
  headerVals.forEach((value, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = value;
    cell.font = font(CLR.headerFg, true, 10);
    cell.fill = fill(CLR.headerBg);
    cell.alignment = align('center');
    cell.border = border;
  });

  const moodMap = new Map(moodRecords.map(record => [record.date, record]));
  const moodRows = getMoodSlots();

  let rowIdx = 3;
  for (const rowDef of moodRows) {
    const row = ws.getRow(rowIdx++);
    row.height = 24;

    const timeCell = row.getCell(1);
    timeCell.value = rowDef.label;
    timeCell.font = font(CLR.timeFg, true, 10);
    timeCell.fill = fill(CLR.timeBg);
    timeCell.border = border;
    timeCell.alignment = align('center');

    moodRecords.forEach((rec, ci) => {
      const cell = row.getCell(2 + ci);
      const entry = moodMap.get(rec.date)?.slots?.[rowDef.key];
      cell.border = border;
      cell.alignment = align('center');

      if (entry) {
        cell.value = `${formatMoodChoice(entry)}\n(${entry.score >= 0 ? '+' : ''}${entry.score})`;
        cell.font = font(scoreFont(entry.score), true, 9);
        cell.fill = fill(scoreToMoodFill(entry.score));
      } else {
        cell.value = '—';
        cell.font = font('9E9E9E', false, 9);
        cell.fill = fill('FAFAFA');
      }
    });
  }

  const avgRow = ws.getRow(rowIdx);
  avgRow.height = 22;
  const avgLabelCell = avgRow.getCell(1);
  avgLabelCell.value = 'Average Mood Score';
  avgLabelCell.font = font(CLR.avgFg, true, 11);
  avgLabelCell.fill = fill(CLR.avgBg);
  avgLabelCell.alignment = align('center');
  avgLabelCell.border = border;

  moodRecords.forEach((rec, ci) => {
    const cell = avgRow.getCell(2 + ci);
    cell.value = rec.average === null || rec.average === undefined ? '—' : rec.average;
    cell.font = font(CLR.avgFg, true, 11);
    cell.fill = fill(CLR.avgBg);
    cell.alignment = align('center');
    cell.border = border;
  });

  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }];
}

function formatColDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getUTCDay()]}\n${day} ${months[month - 1]}`;
}

function scoreToMoodFill(score) {
  if (score >= 4) return 'C8E6C9';
  if (score >= 2) return 'BBDEFB';
  if (score >= 1) return 'FFF9C4';
  if (score >= 0) return 'ECEFF1';
  if (score >= -2) return 'FFE0B2';
  return 'FFCDD2';
}

function scoreFont(score) {
  if (score >= 4) return '1B5E20';
  if (score >= 2) return '0D47A1';
  if (score >= 0) return '455A64';
  return 'B71C1C';
}

module.exports = { generateExcel };
