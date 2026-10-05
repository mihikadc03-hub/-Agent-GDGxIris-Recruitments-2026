# SyncPlay (Task ID: SyncPlay)

## Overview
**SyncPlay** is a music listening application built in Flutter with real-time music synchronization features. It allows users to browse a list of songs, play music, add songs to their favourites, and create or join listening rooms to listen in sync with others.

Instead of Firebase, this implementation utilizes a custom local Node.js WebSocket backend (via `socket.io`) to handle real-time synchronization, which perfectly fulfills the "Firebase or another suitable real-time solution" requirement and avoids complicated API key setups for testing.

### Features Included (Medium Difficulty)
- **Home Screen**: Browse songs with title, artist, and album art.
- **Music Player**: Play, pause, seek, and track progress using the `just_audio` package.
- **Favourites**: Mark/unmark songs as favourite (maintained in app memory).
- **Listening Room & Real-time Sync**: Create a room to generate a code, or join a room using a code. 
- **Music Synchronization**: Any state change (play, pause, seek, song change) is instantly broadcasted to all users in the same room.

## Tech Stack
- **Frontend**: Flutter
- **Backend**: Node.js, Express, Socket.io
- **State Management**: Provider
- **Audio Player**: just_audio

## Running Locally

### 1. Start the Sync Backend
Ensure you have Node.js installed, then navigate to the `backend` folder:
```bash
cd backend
npm install
node index.js
```
The socket server will run on `http://localhost:4000`.

### 2. Run the Flutter App
Open a new terminal and navigate to the project root:
```bash
cd syncplay
flutter pub get
flutter run -d chrome  # or whatever your preferred device is
```

> **Note for Android Emulator Users:** If you are testing via an Android Emulator, you'll need to change `http://localhost:4000` to `http://10.0.2.2:4000` in `lib/providers/music_provider.dart` to reach the local backend. For Chrome/Web or desktop builds, `localhost` works perfectly!
