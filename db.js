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
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
    }
  }

  firestore = admin.firestore();
  return firestore;
}

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return parsed;
  } catch (err) {
    throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT_JSON: ${err.message}`);
  }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function recordRef(phone, date = todayStr()) {
  return getFirestore()
    .collection('users')
    .doc(phone)
    .collection('records')
    .doc(date);
}

async function getTodayRecord(phone) {
  const date = todayStr();
  const snap = await recordRef(phone, date).get();
  const rec = snap.exists
    ? snap.data()
    : { done: {}, regrets: {}, xp: 0, learning_times: {} };

  return { date, ...normalizeRecord(rec) };
}

async function upsertRecord(phone, record) {
  const date = record.date || todayStr();
  const data = normalizeRecord(record);
  await recordRef(phone, date).set(
    {
      phone,
      date,
      ...data
    },
    { merge: true }
  );
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

function normalizeRecord(record) {
  return {
    done: record.done || {},
    regrets: record.regrets || {},
    xp: Number(record.xp || 0),
    learning_times: record.learning_times || {}
  };
}

module.exports = { getTodayRecord, upsertRecord, getRange };
