// ============================================================
//  db.js  —  SQLite data layer (swap to Postgres for prod)
//  Each row = one user + one date
//  data column stores JSON blob: { done, regrets, xp, learning_times }
// ============================================================

const { DatabaseSync } = require('node:sqlite');
const path             = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'dailyxp.db');
const db      = new DatabaseSync(DB_PATH);

// ── Schema ──────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    phone   TEXT    NOT NULL,
    date    TEXT    NOT NULL,       -- YYYY-MM-DD
    data    TEXT    NOT NULL DEFAULT '{}',
    UNIQUE(phone, date)
  );
  CREATE INDEX IF NOT EXISTS idx_phone_date ON records(phone, date);
`);

// ── Helpers ─────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getTodayRecord(phone) {
  const date = todayStr();
  const row  = db.prepare(
    'SELECT data FROM records WHERE phone=? AND date=?'
  ).get(phone, date);

  const rec = row ? JSON.parse(row.data) : { done:{}, regrets:{}, xp:0, learning_times:{} };
  rec.date  = date;
  return rec;
}

function upsertRecord(phone, record) {
  const date = record.date || todayStr();
  const { date: _d, ...data } = record;           // strip date from JSON blob
  db.prepare(`
    INSERT INTO records (phone, date, data)
    VALUES (?, ?, ?)
    ON CONFLICT(phone, date) DO UPDATE SET data=excluded.data
  `).run(phone, date, JSON.stringify(data));
}

function getRange(phone, startDate, endDate) {
  const start = startDate.toISOString().slice(0, 10);
  const end   = endDate.toISOString().slice(0, 10);
  const rows  = db.prepare(`
    SELECT date, data FROM records
    WHERE phone=? AND date>=? AND date<=?
    ORDER BY date ASC
  `).all(phone, start, end);

  // Fill missing dates with empty records
  const result = [];
  const cur    = new Date(start);
  const endD   = new Date(end);
  const rowMap = Object.fromEntries(rows.map(r => [r.date, JSON.parse(r.data)]));

  while (cur <= endD) {
    const ds  = cur.toISOString().slice(0, 10);
    result.push({ date: ds, ...(rowMap[ds] || { done:{}, regrets:{}, xp:0, learning_times:{} }) });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

module.exports = { getTodayRecord, upsertRecord, getRange };
