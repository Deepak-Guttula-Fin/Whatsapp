// ============================================================
//  db.js  -  Firebase Firestore data layer
//  users/{phone}/records/{date}
//  Each record stores JSON: { done, regrets, xp, learning_times }
// ============================================================

const admin = require('firebase-admin');

let firestore = null;

function getFirestore() {
  if (firestore) return firestore;

  if (!admin.apps.length) {
    const serviceAccount = loadServiceAccount();
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || serviceAccount.projectId || process.env.FIREBASE_PROJECT_ID
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
    }
  }

  firestore = admin.firestore();
  return firestore;
}

function loadServiceAccount() {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (raw) {
    try {
      const parsed = JSON.parse(stripWrappingQuotes(raw));
      if (parsed.private_key) {
        parsed.private_key = normalizePrivateKey(parsed.private_key);
      }
      return parsed;
    } catch (err) {
      throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT_JSON: ${err.message}`);
    }
  }

  const projectId = (process.env.FIREBASE_PROJECT_ID || '').trim();
  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').trim();

  if (projectId && clientEmail && privateKey) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: normalizePrivateKey(privateKey)
    };
  }

  return null;
}

function stripWrappingQuotes(value) {
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }
  return value;
}

function normalizePrivateKey(value) {
  return stripWrappingQuotes(String(value))
    .replace(/\r\n/g, '\n')
    .replace(/\\n/g, '\n')
    .trim();
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function istTodayStr() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function recordRef(phone, date = todayStr()) {
  return getFirestore()
    .collection('users')
    .doc(phone)
    .collection('records')
    .doc(date);
}

function schedulerStateRef(date = todayStr()) {
  return getFirestore()
    .collection('scheduler_state')
    .doc(date);
}

function moodRecordRef(phone, date = istTodayStr()) {
  return getFirestore()
    .collection('users')
    .doc(phone)
    .collection('moods')
    .doc(date);
}

async function getTodayRecord(phone) {
  const date = todayStr();
  return getRecord(phone, date);
}

async function getRecord(phone, date) {
  const snap = await recordRef(phone, date).get();
  const rec = snap.exists
    ? snap.data()
    : { done: {}, regrets: {}, xp: 0, learning_times: {} };

  return { date, ...normalizeRecord(rec) };
}

async function upsertRecord(phone, record) {
  const date = record.date || todayStr();
  const data = normalizeRecord(record);
  await recordRef(phone, date).set({
    phone,
    date,
    ...data
  });
}

async function deleteRecord(phone, date) {
  await recordRef(phone, date).delete();
}

async function deleteTodayRecord(phone) {
  await deleteRecord(phone, todayStr());
}

async function deleteAllRecords(phone) {
  const snap = await getFirestore()
    .collection('users')
    .doc(phone)
    .collection('records')
    .get();

  const deletes = snap.docs.map(doc => doc.ref.delete());
  await Promise.all(deletes);
}

async function getRange(phone, startDate, endDate) {
  const result = [];
  const cur = new Date(startDate);
  const end = new Date(endDate);

  while (cur <= end) {
    const date = cur.toISOString().slice(0, 10);
    const snap = await recordRef(phone, date).get();
    const rec = snap.exists
      ? snap.data()
      : { done: {}, regrets: {}, xp: 0, learning_times: {} };

    result.push({ date, ...normalizeRecord(rec) });
    cur.setDate(cur.getDate() + 1);
  }

  return result;
}

async function getMoodRecord(phone, date = istTodayStr()) {
  const snap = await moodRecordRef(phone, date).get();
  const rec = snap.exists
    ? snap.data()
    : { slots: {}, average: null };

  return {
    date,
    slots: rec.slots || {},
    average: rec.average ?? null
  };
}

async function upsertMoodEntry(phone, date, slotKey, mood) {
  const current = await getMoodRecord(phone, date);
  const slots = { ...(current.slots || {}) };
  slots[slotKey] = {
    key: mood.key,
    label: mood.label,
    emoji: mood.emoji,
    score: mood.score,
    slotLabel: mood.slotLabel || null,
    selectedAt: mood.selectedAt || new Date().toISOString()
  };

  const scores = Object.values(slots)
    .map(entry => Number(entry.score))
    .filter(score => Number.isFinite(score));

  const average = scores.length
    ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2))
    : null;

  await moodRecordRef(phone, date).set({
    phone,
    date,
    slots,
    average,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { date, slots, average };
}

async function getMoodRange(phone, startDate, endDate) {
  const result = [];
  const cur = new Date(startDate);
  const end = new Date(endDate);

  while (cur <= end) {
    const date = cur.toISOString().slice(0, 10);
    result.push(await getMoodRecord(phone, date));
    cur.setDate(cur.getDate() + 1);
  }

  return result;
}

async function getSchedulerState(date = todayStr()) {
  const snap = await schedulerStateRef(date).get();
  return snap.exists ? snap.data() : { sentSlots: {} };
}

async function markSchedulerSlotSent(date, slotKey) {
  await schedulerStateRef(date).set(
    {
      date,
      sentSlots: {
        [slotKey]: true
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

function normalizeRecord(record) {
  return {
    done: record.done || {},
    regrets: record.regrets || {},
    xp: Number(record.xp || 0),
    learning_times: record.learning_times || {}
  };
}

module.exports = {
  getTodayRecord,
  getRecord,
  upsertRecord,
  getRange,
  getMoodRecord,
  upsertMoodEntry,
  getMoodRange,
  deleteRecord,
  deleteTodayRecord,
  deleteAllRecords,
  getSchedulerState,
  markSchedulerSlotSent
};
