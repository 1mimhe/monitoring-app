import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from './types';
import logger from '../utils/logger';
import { registerSocketEvents } from './socket';
import { createClient } from '@redis/client';

const app = express();
const server = http.createServer(app);
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(server);

app.use(express.static(path.join(__dirname, '../public')));

const redis = createClient({
  url: process.env.REDIS_URL ?? undefined
});
redis.connect().catch(console.error);

io.on('connection', (socket) => {
  registerSocketEvents(socket, io, redis);
});

const PORT = process.env.PORT ?? 3000;
server.listen(PORT, () => logger.success(`Server listening on port ${PORT}.`));