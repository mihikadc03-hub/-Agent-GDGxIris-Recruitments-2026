# UniClip (Task ID: UniClip)

## Overview
**UniClip** is a web application that allows users to sync text and links across their devices in real-time. By creating a temporary session, you can securely share clipboard data between multiple devices (like your phone and laptop) without needing an account.

### Features Included
- **Session & Pairing**: Create a session instantly, or join one using a 6-digit code.
- **Clipboard Sync**: Easily sync your current clipboard content to all devices in the room. Links are automatically detected and rendered as clickable tags.
- **Real-Time Synchronization**: Instantly updates all connected devices via WebSockets.
- **Clipboard History**: View previously synced clips, see what device they came from, and quickly copy them to your local clipboard or delete them.
- **Reconnection Handling**: Built on `socket.io`, automatically re-establishes connections if the network drops.

### Bonus Features Included (Hard Difficulty)
- **QR Pairing**: A QR code is generated on the dashboard. You can scan it to instantly grab the session ID on your phone!
- **Burn After Sync**: An optional security feature. When enabled upon session creation, any clipboard entry will be *permanently deleted* from the room's history the moment another device successfully copies it.

## Tech Stack
- **Frontend**: React (Vite), TypeScript, CSS
- **Backend**: Node.js, Express, Socket.io (WebSocket API)

## Running Locally

### 1. Start the Backend
```bash
cd backend
npm install
npm run dev
```
*Runs on `http://localhost:5000`*

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev -- --port 5174
```
*Runs on `http://localhost:5174`*
