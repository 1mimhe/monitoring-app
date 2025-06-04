import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from './types/types';

const app = express();
const server = http.createServer(app);
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(server);

app.use(express.static(path.join(__dirname, '../public')));

io.on('connection', (socket) => {
  console.log('A user connected.');

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('init', (pcName) => {
    socket.data.pcName = pcName;
    socket.emit('message', `WELCOME ${pcName}`);
  });

  socket.on('message', (msg) => {
    console.log(`A new message from ${socket.data.pcName} -> ${msg}`);
    socket.emit('message', msg);
  });

  socket.on('broadcast', (msg) => {
    console.log(`A broadcast message from ${socket.data.pcName} -> ${msg}`);
    io.emit('message', msg);
  });
});

const PORT = process.env.PORT ?? 3000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}!`));