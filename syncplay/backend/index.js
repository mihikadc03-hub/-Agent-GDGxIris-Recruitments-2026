const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 4000;

const rooms = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join_room', ({ roomId }) => {
    socket.join(roomId);
    if (!rooms[roomId]) {
      rooms[roomId] = { users: [], state: null };
    }
    rooms[roomId].users.push(socket.id);
    console.log(`User ${socket.id} joined room ${roomId}`);
    
    // Send current state to newly joined user
    if (rooms[roomId].state) {
      socket.emit('sync_state', rooms[roomId].state);
    }
  });

  socket.on('sync_state', ({ roomId, state }) => {
    rooms[roomId].state = state;
    // Broadcast to everyone else in the room
    socket.to(roomId).emit('sync_state', state);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    for (const roomId in rooms) {
      const index = rooms[roomId].users.indexOf(socket.id);
      if (index !== -1) {
        rooms[roomId].users.splice(index, 1);
        if (rooms[roomId].users.length === 0) {
          delete rooms[roomId]; // Clean up empty rooms
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`SyncPlay Backend running on port ${PORT}`);
});
