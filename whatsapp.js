// ============================================================
//  whatsapp.js  —  Send messages & files via Twilio WhatsApp
//  Set env vars: TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM, FILE_HOST
// ============================================================

const twilio = require('twilio');
const fs     = require('fs');
const os     = require('os');
const path   = require('path');

const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_TOKEN
);
const FROM   = process.env.TWILIO_FROM; // e.g. 'whatsapp:+14155238886'

async function sendMessage(to, body) {
  await client.messages.create({
    from: FROM,
    to:   `whatsapp:${to}`,
    body
  });
}

async function sendFile(to, buffer, filename, caption) {
  // Save buffer to temp file, serve via public URL
  // In production: upload to S3/GCS and use that URL
  const tmpDir  = os.tmpdir();
  const tmpFile = path.join(tmpDir, filename);
  fs.writeFileSync(tmpFile, buffer);

  const fileHost = process.env.FILE_HOST; // e.g. https://yourserver.com
  // For a real deploy, upload the buffer to S3 and get a presigned URL
  // Here we assume FILE_HOST serves /tmp files (configure your server accordingly)
  const mediaUrl = `${fileHost}/files/${filename}`;

  await client.messages.create({
    from:     FROM,
    to:       `whatsapp:${to}`,
    body:     `📊 *${caption}*\nYour Excel report is ready.`,
    mediaUrl: [mediaUrl]
  });
}

module.exports = { sendMessage, sendFile };
