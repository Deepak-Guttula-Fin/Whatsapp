# DailyXP WhatsApp Bot 🤖⚡

A WhatsApp chatbot that tracks your daily tasks, awards XP points, and sends automated reports — daily, weekly, and monthly Excel reports.

---

## Features

- **Dynamic NLP commands** — say it naturally: *"workout done"*, *"did gym"*, *"finished reading"*, *"had guilt today"*
- **XP scoring** — earn points for healthy habits, lose points for regrets
- **4× daily reports** — auto-sent at 9 AM, 3 PM, 6 PM, 10 PM (IST)
- **Learning time tracking** — bot asks HH:MM for each completed learning task
- **Weekly Excel** — every Sunday at 10 PM
- **MTD Excel** — 10th, 20th, and last day of every month at 10 PM
- **On-demand consolidated report** — full history any time

---

## Quick Start

### 1. Clone & install

```bash
git clone <your-repo>
cd dailyxp-whatsapp-bot
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your Twilio credentials
```

### 3. Set up Twilio WhatsApp Sandbox

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Messaging → Try it out → Send a WhatsApp message**
3. Follow sandbox join instructions (send a code to +1 415 523 8886)
4. Set webhook URL: `https://your-domain.com/webhook`

### 4. Expose local server (for development)

```bash
# Install ngrok: https://ngrok.com
ngrok http 3000
# Copy the https URL → paste into Twilio webhook + .env FILE_HOST
```

### 5. Run

```bash
npm start       # production
npm run dev     # development (auto-restart)
```

---

## Deployment (Railway / Render)

1. Push to GitHub
2. Connect repo to [Railway](https://railway.app) or [Render](https://render.com)
3. Add environment variables from `.env.example`
4. Set start command: `node server.js`
5. Update `FILE_HOST` in env vars to your deployed URL
6. Update Twilio webhook URL

---

## XP System

### Physical Health
| Task | XP |
|---|---|
| Workout / Gym | +20 |
| Hydration (3L) | +10 |
| Sleep (7–8h) | +10 |
| Cold Shower | +15 |
| Healthy Eating | +10 |

### Learning *(records time spent)*
| Task | XP |
|---|---|
| Reading Practice | +15 |
| Speaking Practice | +20 |
| Writing Practice | +20 |
| Listening Practice | +15 |

### Finance
| Task | XP |
|---|---|
| Portfolio Review | +10 |
| Economic Updates | +15 |

### Regrets
| Task | XP |
|---|---|
| Guilt | −10 |
| Shouted | −20 |
| Physical Assault | −30 |
| Unnecessary Expenses | −20 |

---

## Commands (Dynamic — say it naturally)

```
# Complete a task
workout done | did gym | finished reading | speaking practice complete
done workout hydration sleep    ← bulk logging

# Log a regret
guilt yes | i shouted | had unnecessary expenses today
no shouted | didn't have guilt

# Undo a task
undo workout | remove sleep | unmark hydration

# Reports
report          → today's dashboard
weekly          → request weekly Excel
mtd             → request MTD Excel
consolidated    → full all-time Excel
xp              → quick XP check
tasks           → full task list
help            → command guide
```

---

## Dashboard Format

```
End-of-Day Report
📅 May, 19-2025 10:00 PM
━━━━━━━━━━━━━━━━━━
⚡ Score: +75 XP
━━━━━━━━━━━━━━━━━━

✅ Achieved Tasks

💪 Physical Health
  • Workout / Gym — (+20 XP)
  • Hydration (3L) — (+10 XP)
  • Sleep (7–8h) — (+10 XP)

📚 Learning
  • Reading Practice — (+15 XP) ⏱ 0:45
  • Speaking Practice — (+20 XP) ⏱ 1:00

❌ Unachieved Tasks

💪 Physical Health
  • Cold Shower
  • Healthy Eating

😔 Regrets
  • Guilt — No
  • Shouted — No
  • Physical Assault — not recorded
  • Unnecessary Expenses — Yes (-20 XP)
```

---

## Excel Report Structure

- **Columns** = Dates (one column per day)
- **Rows** = Tasks (grouped by category)
- **Learning cells** = show `HH:MM` (time spent) instead of ✓/✗
- **Regret cells** = `Yes (-20 XP)` or `No`
- **Last row** = Total XP per day (highlighted)
- **Frozen panes** = Category/Task columns always visible while scrolling

---

## Project Structure

```
dailyxp-whatsapp-bot/
├── server.js          ← Express server + webhook
├── bot.js             ← Message handler + intent detection
├── tasks.js           ← Task/regret definitions + aliases
├── dashboard.js       ← WhatsApp text report formatter
├── excel.js           ← Excel report generator (ExcelJS)
├── db.js              ← Firebase Firestore data layer
├── whatsapp.js        ← Twilio sender
├── scheduler.js       ← Cron jobs
├── test_excel.js      ← Test Excel without WhatsApp
├── test_dashboard.js  ← Test dashboard text output
├── .env.example
├── render.yaml
└── package.json
```

---

## Testing Without WhatsApp

```bash
# Test Excel generation (creates test_output.xlsx)
npm run test:excel

# Test dashboard text output
npm run test:dashboard
```
