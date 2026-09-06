import 'dotenv/config';
import net from 'net';
import { AgentEventHandler } from './events';
import logger from '../../../shared/logger';

const PORT    = Number(process.env.AGENT_TCP_PORT) || 3333;
const ADDRESS = process.env.AGENT_TCP_ADDRESS || '0.0.0.0';

const tcpServer = net.createServer((socket) => {
  const remote = `${socket.remoteAddress}:${socket.remotePort}`;
  logger.success(`Central manager connected from ${remote}`);

  const handler = new AgentEventHandler(socket);
  handler.startMonitoring();

  socket.on('data', (data) => handler.handleTCPData(data));

  socket.on('end', () => {
    logger.warn(`Central manager disconnected (${remote})`);
    handler.cleanup();
  });

  socket.on('error', (err) => {
    logger.error(`TCP socket error (${remote})`, err);
    handler.cleanup();
  });
});

tcpServer.on('error', (err) => logger.error('TCP server error', err));

tcpServer.listen(PORT, ADDRESS, () => {
  logger.success(`Socket Agent TCP server listening on ${ADDRESS}:${PORT}`);
});
