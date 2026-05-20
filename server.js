// ============================================================
//  server.js  —  Express webhook server
//  POST /webhook  ← Twilio sends WhatsApp messages here
//  GET  /health   ← uptime ping
//  GET  /files/:f ← serve generated Excel files
// ============================================================

require('dotenv').config();

const express  = require('express');
const bodyParser = require('body-parser');
const path     = require('path');
const os       = require('os');
const fs       = require('fs');

const { handleMessage } = require('./bot');
require('./scheduler');              // registers all cron jobs on startup
const { startTelegramBot } = require('./telegram');

startTelegramBot();                   // starts Telegram bot if token is set

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// ── Health check ─────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Serve generated Excel files ───────────────────────────────
app.get('/files/:filename', (req, res) => {
  const fp = path.join(os.tmpdir(), req.params.filename);
  if (!fs.existsSync(fp)) return res.status(404).send('Not found');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.sendFile(fp);
});

// ── Twilio WhatsApp webhook ───────────────────────────────────
app.post('/webhook', async (req, res) => {
  // Twilio sends form-encoded body
  const from = req.body.From?.replace('whatsapp:', '') || req.body.from;
  const body = req.body.Body  || req.body.body || '';

  console.log('[Webhook] Incoming message:', {
    from,
    body,
    method: req.method,
    url: req.originalUrl
  });

  if (!from || !body) return res.status(400).send('Missing from/body');

  // Acknowledge immediately (Twilio 15s timeout)
  res.status(200).send('<Response/>');

  // Process async
  try {
    await handleMessage(from, body);
  } catch (err) {
    console.error('[Webhook] Error:', err);
  }
});

app.listen(PORT, () => {
  console.log(`✅ DailyXP Bot running on port ${PORT}`);
  console.log(`   Webhook: POST http://localhost:${PORT}/webhook`);
  console.log(`   Health:  GET  http://localhost:${PORT}/health`);
});
