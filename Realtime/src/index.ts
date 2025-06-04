import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '../public')));

io.on('connection', (socket) => {
  console.log('A user connected.');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

const { PORT } = process.env ?? 3000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}!`));