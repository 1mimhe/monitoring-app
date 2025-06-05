import { Server, Socket } from 'socket.io';
import { RedisClientType } from '@redis/client';
import logger from '../utils/logger';
import { ClientToServerEvents, InterServerEvents, MessageTypes, ServerToClientEvents, SocketData } from './types';

export function registerSocketEvents(
  socket: Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >,
  io: Server,
  redis: RedisClientType
) {
  socket.on('disconnect', () => {
    logger.warn(`User ${socket.data.pcName} disconnected.`);
  });

  socket.on('join', ({ pcName, room }, ack) => {
    socket.join(room);

    socket.data.pcName = pcName;
    socket.data.room = room;

    socket.emit('message', `WELCOME ${pcName}`, MessageTypes.Admin, 'Admin');
    // TODO: emit a message to admin that this user joined or disconnected.
    logger.info(`User joined -> ${pcName} in Room ${room}`);
    
    ack();
  });

  socket.on('message', (msg, ack) => {
    logger.info(`Message - from ${socket.data.pcName} -> ${msg}`);
    socket.emit('message', msg);
    ack();
  });

  socket.on('broadcast', (msg, ack) => {
    logger.info(`Broadcast - from ${socket.data.pcName} -> ${msg}`);
    socket.emit('message', msg, MessageTypes.Broadcast);
    socket.broadcast.to(socket.data.room).emit('message', msg,MessageTypes.Broadcast, socket.data.pcName);
    ack();
  });
}