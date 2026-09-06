import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from './types';
import logger from '../../../shared/logger';
import { registerSocketEvents } from './socket';

const app    = express();
const server = http.createServer(app);

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(server, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  },
});

app.use(express.static(path.join(__dirname, '../../public')));

io.on('connection', (socket) => {
  logger.debug(`Socket connected: ${socket.id}`);
  registerSocketEvents(socket, io);
});

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, () =>
  logger.success(`Realtime server listening on http://localhost:${PORT}`)
);