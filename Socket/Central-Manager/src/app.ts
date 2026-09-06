import 'dotenv/config';
import net from 'net';
import dgram from 'dgram';
import readline from 'readline';
import logger from '../../../shared/logger';

// ── Configuration ──────────────────────────────────────────────────────────────
const UDP_PORT = Number(process.env.CENTRAL_MANAGER_UDP_PORT) || 5000;
const UDP_ADDRESS = process.env.CENTRAL_MANAGER_UDP_ADDRESS || '0.0.0.0';

/**
 * Parse agent list from env:  "192.168.1.10:3333,192.168.1.11:3333"
 * Falls back to a single example entry so the user sees the expected format.
 */
const AGENT_CONFIGS: Array<{ address: string; port: number }> = (() => {
  const raw = process.env.AGENTS ?? '';
  if (!raw.trim()) {
    logger.warn('AGENTS env var is not set. Add entries like: 192.168.1.10:3333,192.168.1.11:3333');
    return [];
  }
  return raw.split(',').map((entry) => {
    const [address, portStr] = entry.trim().split(':');
    return { address: address.trim(), port: Number(portStr) || 3333 };
  });
})();

// ── Agent Connection State ─────────────────────────────────────────────────────
interface AgentState {
  address: string;
  port: number;
  socket: net.Socket | null;
  connected: boolean;
  buffer: string;
}

const agents: AgentState[] = AGENT_CONFIGS.map((cfg) => ({
  ...cfg,
  socket: null,
  connected: false,
  buffer: '',
}));

// ── UDP Server — Receives alerts from agents ────────────────────────────────────
const udpServer = dgram.createSocket('udp4');

udpServer.on('message', (msg, remote) => {
  logger.warn(`UDP Alert from ${remote.address}:${remote.port}\n  ${msg.toString().replace(/\n/g, '\n  ')}`);
});

udpServer.on('listening', () => {
  const addr = udpServer.address();
  logger.success(`UDP server listening on ${addr.address}:${addr.port}`);
});

udpServer.on('error', (err) => logger.error('UDP server error', err));

udpServer.bind(UDP_PORT, UDP_ADDRESS);

// ── TCP — Connect to each agent ────────────────────────────────────────────────
function connectToAgent(agent: AgentState): void {
  const label = `${agent.address}:${agent.port}`;
  const client = new net.Socket();
  agent.socket = client;

  client.connect(agent.port, agent.address, () => {
    agent.connected = true;
    logger.success(`Connected to agent at ${label}`);
    // Inform the agent of this manager's UDP listener
    client.write(`UDPListeningOn: ${UDP_ADDRESS} ${UDP_PORT}`);
  });

  // Accumulate chunks until we have valid JSON
  client.on('data', (chunk: Buffer) => {
    agent.buffer += chunk.toString();
    if (isValidJSON(agent.buffer)) {
      try {
        const data = JSON.parse(agent.buffer);
        agent.buffer = '';
        logger.info(`Response from ${label}:`);
        console.dir(data, { depth: 4, colors: true });
      } catch {
        // Not fully buffered yet — wait for more chunks
      }
    } else if (!agent.buffer.startsWith('{') && !agent.buffer.startsWith('[')) {
      // Plain text response (e.g. "Invalid command." or "System rebooting...")
      logger.info(`Response from ${label}: ${agent.buffer.trim()}`);
      agent.buffer = '';
    }
  });

  client.on('close', () => {
    agent.connected = false;
    logger.warn(`Connection to ${label} closed.`);
  });

  client.on('error', (err) => {
    agent.connected = false;
    logger.error(`Connection error for ${label}`, err);
  });
}

// Connect to all configured agents
agents.forEach(connectToAgent);

// ── CLI — Interactive command sending ──────────────────────────────────────────
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function printHelp(): void {
  console.log('\n  Commands:');
  agents.forEach((agent, i) => {
    const status = agent.connected ? '🟢 online' : '🔴 offline';
    console.log(`    ${i}  ${agent.address}:${agent.port}  (${status})`);
  });
  console.log('\n  Usage: <agent-index> <command>');
  console.log('  Commands: info | reboot | help\n');
}

printHelp();

rl.on('line', (input: string) => {
  const trimmed = input.trim();
  if (!trimmed || trimmed === 'help') { printHelp(); return; }

  const [indexStr, ...commandParts] = trimmed.split(/\s+/);
  const command = commandParts.join(' ');
  const index = Number(indexStr);

  if (isNaN(index) || index < 0 || index >= agents.length) {
    logger.warn(`Invalid agent index "${indexStr}". Run "help" to see available agents.`);
    return;
  }

  const agent = agents[index];
  if (!agent.connected || !agent.socket) {
    logger.warn(`Agent ${agent.address}:${agent.port} is not connected.`);
    return;
  }

  const validCommands = ['info', 'reboot'];
  if (!validCommands.includes(command)) {
    logger.warn(`Unknown command "${command}". Valid: ${validCommands.join(', ')}`);
    return;
  }

  agent.socket.write(command);
  logger.info(`Sent "${command}" to agent ${index} (${agent.address}:${agent.port})`);
});

// ── Helpers ────────────────────────────────────────────────────────────────────
function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}
