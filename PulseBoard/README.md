# PulseBoard (Task ID: PulseBoard)

## Overview
**PulseBoard** is a self-hosted notification hub combining **Service Workers**, the **Web Push API**, and a backend **Concurrent Polling Scheduler**. It allows users to subscribe to RSS feeds and JSON Webhooks and receive OS-level desktop notifications when new content is detected, even if the browser tab is closed.

### Implementation Features
- **Phase 1: Source Management**: Users can add URLs for RSS feeds or JSON webhooks. The backend validates and persists them to an SQLite database (`pulseboard.db`).
- **Phase 2: Concurrent Polling Scheduler**: A Node.js `node-cron` job runs every minute. It maps over all stored sources and polls them concurrently using `Promise.allSettled`, ensuring slow sources do not block others.
- **Phase 3: Change Detection**: 
  - For RSS, it tracks the latest item's GUID/link.
  - For JSON, it hashes the response using SHA-256 and diffs the hash against the stored snapshot.
- **Phase 4 & 5: Service Worker & Push**: The frontend registers `sw.js` and subscribes to the Web Push API via generated VAPID keys. The backend asynchronously pushes a payload using the `web-push` library whenever change detection triggers.
- **Phase 6: Dashboard & IndexedDB**: The `sw.js` intercepts push events, triggers `showNotification`, and independently saves the payload to an **IndexedDB** store (`idb`). The React dashboard automatically reads from this DB to display your Notification History and unread counts, satisfying the offline storage requirement!

## Running Locally

### 1. Start the Backend (Port 8082)
```bash
cd backend
npm install
node server.js
```

### 2. Start the Frontend (Port 5179)
```bash
cd frontend
npm install
npm run dev -- --port 5179
```

Open `http://localhost:5179`. Click "Enable Push Notifications" (accept the browser prompt). Then add a source (e.g. an RSS feed like `https://news.ycombinator.com/rss` or a JSON API). Within a minute of a change (or on first run update), you'll receive a native push notification!
