const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const webpush = require('web-push');
const Parser = require('rss-parser');
const cron = require('node-cron');
const crypto = require('crypto');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 8082;
const parser = new Parser();

// Generate VAPID keys if they don't exist
const vapidPath = './vapid.json';
let vapidKeys;
if (fs.existsSync(vapidPath)) {
  vapidKeys = JSON.parse(fs.readFileSync(vapidPath));
} else {
  vapidKeys = webpush.generateVAPIDKeys();
  fs.writeFileSync(vapidPath, JSON.stringify(vapidKeys));
}
webpush.setVapidDetails('mailto:test@example.com', vapidKeys.publicKey, vapidKeys.privateKey);

// Database Setup
const db = new sqlite3.Database('./pulseboard.db');
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY,
    label TEXT,
    url TEXT,
    type TEXT,
    latest_snapshot TEXT
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    subscription JSON
  )`);
});

// === API ROUTES ===

app.get('/vapidPublicKey', (req, res) => {
  res.send(vapidKeys.publicKey);
});

app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  const id = crypto.createHash('md5').update(JSON.stringify(subscription.endpoint)).digest('hex');
  db.run(`INSERT OR REPLACE INTO subscriptions (id, subscription) VALUES (?, ?)`, [id, JSON.stringify(subscription)], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({});
  });
});

app.post('/sources', async (req, res) => {
  const { label, url, type } = req.body;
  try {
    if (type === 'rss') await parser.parseURL(url);
    else await fetch(url).then(r => r.json());
  } catch (e) {
    return res.status(400).json({ error: 'Failed to reach or parse URL' });
  }
  
  const id = uuidv4();
  db.run(`INSERT INTO sources (id, label, url, type, latest_snapshot) VALUES (?, ?, ?, ?, ?)`, [id, label, url, type, ''], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id, label, url, type });
  });
});

app.get('/sources', (req, res) => {
  db.all(`SELECT id, label, url, type FROM sources`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.delete('/sources/:id', (req, res) => {
  db.run(`DELETE FROM sources WHERE id = ?`, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// === SCHEDULER ===

const pollSource = async (source) => {
  console.log(`Polling source: ${source.label} (${source.url})`);
  let isNew = false;
  let newSnapshot = '';
  let pushPayload = null;

  try {
    if (source.type === 'rss') {
      const feed = await parser.parseURL(source.url);
      if (feed.items && feed.items.length > 0) {
        const latestItem = feed.items[0];
        const identifier = latestItem.guid || latestItem.link || latestItem.title;
        if (source.latest_snapshot !== identifier) {
          if (source.latest_snapshot !== '') isNew = true;
          newSnapshot = identifier;
          pushPayload = {
            title: source.label,
            body: `New post: ${latestItem.title}`,
            url: latestItem.link || source.url,
            timestamp: Date.now()
          };
        }
      }
    } else { 
      const resp = await fetch(source.url);
      const data = await resp.json();
      const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
      if (source.latest_snapshot !== hash) {
        if (source.latest_snapshot !== '') {
          isNew = true;
          pushPayload = {
            title: source.label,
            body: 'Data at the endpoint has changed!',
            url: source.url,
            timestamp: Date.now()
          };
        }
        newSnapshot = hash;
      }
    }

    if (isNew) {
      db.run(`UPDATE sources SET latest_snapshot = ? WHERE id = ?`, [newSnapshot, source.id]);
      db.all(`SELECT id, subscription FROM subscriptions`, [], (err, rows) => {
        if (err) return;
        rows.forEach(row => {
          const sub = JSON.parse(row.subscription);
          webpush.sendNotification(sub, JSON.stringify(pushPayload)).catch(e => {
            if (e.statusCode === 410 || e.statusCode === 404) {
              db.run(`DELETE FROM subscriptions WHERE id = ?`, [row.id]);
            }
          });
        });
      });
    } else if (newSnapshot !== '' && source.latest_snapshot === '') {
      db.run(`UPDATE sources SET latest_snapshot = ? WHERE id = ?`, [newSnapshot, source.id]);
    }
  } catch (err) {
    console.error(`Error polling ${source.label}:`, err.message);
  }
};

// Faster interval (every minute) for testing purposes
cron.schedule('* * * * *', () => {
  console.log('Running Concurrent Polling Scheduler...');
  db.all(`SELECT * FROM sources`, [], (err, rows) => {
    if (err) return console.error('DB error during polling', err);
    Promise.allSettled(rows.map(source => pollSource(source)));
  });
});

app.listen(PORT, () => {
  console.log(`PulseBoard Server running on port ${PORT}`);
});
