const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = 8081;

const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', ({ roomId, userName }) => {
    socket.join(roomId);
    
    if (!rooms[roomId]) {
      rooms[roomId] = { host: socket.id, users: [], chat: [] };
    }
    rooms[roomId].users.push({ id: socket.id, name: userName });

    // Notify others in room
    socket.to(roomId).emit('user_joined', { id: socket.id, name: userName });
    
    // Send current state to joined user
    socket.emit('room_state', rooms[roomId]);
  });

  // WebRTC Signaling
  socket.on('offer', (data) => {
    socket.to(data.target).emit('offer', {
      offer: data.offer,
      caller: socket.id,
      callerName: data.callerName
    });
  });

  socket.on('answer', (data) => {
    socket.to(data.target).emit('answer', {
      answer: data.answer,
      answerer: socket.id
    });
  });

  socket.on('ice_candidate', (data) => {
    socket.to(data.target).emit('ice_candidate', {
      candidate: data.candidate,
      sender: socket.id
    });
  });

  socket.on('send_message', ({ roomId, message, userName }) => {
    const msg = { sender: userName, text: message, time: new Date().toISOString() };
    if (rooms[roomId]) {
      rooms[roomId].chat.push(msg);
      io.to(roomId).emit('receive_message', msg);
    }
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const userIndex = room.users.findIndex(u => u.id === socket.id);
      
      if (userIndex !== -1) {
        room.users.splice(userIndex, 1);
        socket.to(roomId).emit('user_left', socket.id);
        
        if (room.users.length === 0) {
          delete rooms[roomId];
        } else if (room.host === socket.id) {
          // Reassign host
          room.host = room.users[0].id;
          io.to(roomId).emit('new_host', room.host);
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`SyncMeet Signaling Server running on port ${PORT}`);
});
