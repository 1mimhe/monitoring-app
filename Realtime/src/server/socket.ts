import { Server, Socket } from 'socket.io';
import { RedisClientType } from '@redis/client';
import logger from '../utils/logger';

export function registerSocketEvents(
  socket: Socket,
  io: Server,
  redis: RedisClientType
) {
  socket.on('disconnect', () => {
    logger.warn(`User ${socket.data.pcName} disconnected.`);
  });

  socket.on('init', (pcName, ack) => {
    socket.data.pcName = pcName;
    socket.emit('message', `WELCOME ${pcName}`, 'admin', 'Admin');
    ack();
  });

  socket.on('message', (msg, ack) => {
    logger.info(`Message - from ${socket.data.pcName} -> ${msg}`);
    socket.emit('message', msg);
    ack();
  });

  socket.on('broadcast', (msg, ack) => {
    logger.info(`Broadcast - from ${socket.data.pcName} -> ${msg}`);
    socket.emit('message', msg, 'broadcast');
    socket.broadcast.emit('message', msg, 'broadcast', socket.data.pcName);
    ack();
  });
}