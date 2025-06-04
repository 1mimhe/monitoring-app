import { Server, Socket } from 'socket.io';
import { RedisClientType } from '@redis/client';

export function registerSocketEvents(
  socket: Socket,
  io: Server,
  redis: RedisClientType
) {
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
}