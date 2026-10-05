# LogStream (Task ID: LogStream)

## Overview
**LogStream** is a lightweight, single-page Developer Observability Dashboard that functions like a live terminal inspector. It uses **Server-Sent Events (SSE)** to stream logs from an Express backend to a React frontend in real-time.

### Features
- **Live Terminal Interface**: See logs generated every 500ms streamed to a dark-themed terminal UI.
- **Start/Stop Controls**: Pause and resume the log stream at any time.
- **Connection Management**: Backend detects disconnects and immediately halts log generation.
- **Performance Optimized**: Rolling frontend log window maxes out at 100 entries.
- **Bonus Features included**:
  - **Log Level Filtering**: Filter by INFO, WARN, ERROR logs dynamically without breaking the socket pipe.
  - **Save Session Output**: Download the current active session's logs as a `.txt` file.
  - **Custom Log Injection**: Send custom logs directly into the stream and broadcast them to all active clients.

## Tech Stack
- **Frontend**: React (with Vite), TypeScript, Vanilla CSS
- **Backend**: Node.js, Express, TypeScript
- **Protocol**: Server-Sent Events (SSE)

## Running Locally

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```
The server will start on `http://localhost:3000`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The application will be available at `http://localhost:5173` (or the port Vite specified).

## Design Details
The design has been optimized for a "wow" factor, utilizing a sleek dark theme, glassmorphic controls, and dynamic hover states for a premium feel.
