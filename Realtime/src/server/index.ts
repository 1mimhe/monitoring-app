import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from './types';
import logger from '../utils/logger';
import { registerSocketEvents } from './socket';

const app = express();
const server = http.createServer(app);
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(server, {
  connectionStateRecovery: {}
});

app.use(express.static(path.join(__dirname, '../../public')));

io.on('connection', (socket) => {
  registerSocketEvents(socket, io);
});

const PORT = process.env.PORT ?? 3000;
server.listen(PORT, () => logger.success(`Server listening on port ${PORT}.`));