import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 5000;

interface ClipEntry {
  id: string;
  content: string;
  type: 'text' | 'link';
  device: string;
  timestamp: number;
}

interface Room {
  users: string[];
  history: ClipEntry[];
  burnAfterSync: boolean;
}

const rooms: Record<string, Room> = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join_session', ({ sessionId, device, burnAfterSync }) => {
    socket.join(sessionId);
    if (!rooms[sessionId]) {
      rooms[sessionId] = { users: [], history: [], burnAfterSync: burnAfterSync || false };
    }
    if (!rooms[sessionId].users.includes(socket.id)) {
      rooms[sessionId].users.push(socket.id);
    }
    
    // Send current history to newly joined user
    socket.emit('sync_history', rooms[sessionId].history);
    socket.to(sessionId).emit('user_joined', { device, usersCount: rooms[sessionId].users.length });
  });

  socket.on('add_clip', ({ sessionId, clip }) => {
    if (rooms[sessionId]) {
      const entry: ClipEntry = {
        id: Math.random().toString(36).substring(2, 9),
        content: clip.content,
        type: clip.type,
        device: clip.device,
        timestamp: Date.now()
      };
      // Check for duplicates
      if (!rooms[sessionId].history.some(e => e.content === entry.content)) {
        rooms[sessionId].history.unshift(entry);
        io.to(sessionId).emit('new_clip', entry);
      }
    }
  });

  socket.on('delete_clip', ({ sessionId, clipId }) => {
    if (rooms[sessionId]) {
      rooms[sessionId].history = rooms[sessionId].history.filter(c => c.id !== clipId);
      io.to(sessionId).emit('clip_deleted', clipId);
    }
  });

  socket.on('clear_history', ({ sessionId }) => {
    if (rooms[sessionId]) {
      rooms[sessionId].history = [];
      io.to(sessionId).emit('history_cleared');
    }
  });

  socket.on('clip_synced', ({ sessionId, clipId, device }) => {
    if (rooms[sessionId] && rooms[sessionId].burnAfterSync) {
      // Burn after sync is enabled, someone successfully synced it.
      // Remove it from history and notify all.
      rooms[sessionId].history = rooms[sessionId].history.filter(c => c.id !== clipId);
      io.to(sessionId).emit('clip_deleted', clipId);
    }
  });

  socket.on('disconnect', () => {
    for (const sessionId in rooms) {
      const index = rooms[sessionId].users.indexOf(socket.id);
      if (index !== -1) {
        rooms[sessionId].users.splice(index, 1);
        if (rooms[sessionId].users.length === 0) {
          // Cleanup empty rooms after a short delay
          setTimeout(() => {
            if (rooms[sessionId] && rooms[sessionId].users.length === 0) {
              delete rooms[sessionId];
            }
          }, 10000);
        } else {
          io.to(sessionId).emit('user_left', { usersCount: rooms[sessionId].users.length });
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`UniClip Backend running on port ${PORT}`);
});
