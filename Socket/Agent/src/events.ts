import dgram from 'dgram';
import net from 'net';
import { getSystemInfo, rebootSystem, chunkString } from '../../../shared/system';
import logger from '../../../shared/logger';

// ── Protocol constants ─────────────────────────────────────────────────────────
/** The central manager sends this prefix to share its UDP listener address. */
const UDP_HANDSHAKE_PREFIX = 'UDPListeningOn:';
/** Maximum TCP chunk size in bytes before splitting the payload. */
const TCP_CHUNK_SIZE = 14_000;
/** Alert threshold — send UDP alert when usage exceeds this percentage. */
const ALERT_THRESHOLD = 80;
/** Interval in ms between alert/monitoring cycles. */
const MONITOR_INTERVAL_MS = 5_000;

interface UDPTarget {
  address: string;
  port: number;
}

export class AgentEventHandler {
  private tcpSocket: net.Socket;
  private udpClient: dgram.Socket;
  private udpTarget: UDPTarget | null = null;
  private alertCounter = 0;
  private monitorInterval: NodeJS.Timeout | null = null;

  constructor(socket: net.Socket) {
    this.tcpSocket = socket;
    // Create a single persistent UDP socket instead of creating one per alert
    this.udpClient = dgram.createSocket('udp4');

    this.udpClient.on('error', (err) => {
      logger.error('UDP client error', err);
    });
  }

  /** Parses incoming TCP data from the central manager. */
  handleTCPData(data: Buffer): void {
    const message = data.toString().trim();
    logger.debug(`TCP received: ${message}`);

    // Handshake: "UDPListeningOn: <address> <port>"
    if (message.startsWith(UDP_HANDSHAKE_PREFIX)) {
      const parts = message.replace(UDP_HANDSHAKE_PREFIX, '').trim().split(/\s+/);
      if (parts.length === 2 && parts[0] && parts[1]) {
        this.udpTarget = { address: parts[0], port: Number(parts[1]) };
        logger.info(`Central manager UDP set to ${this.udpTarget.address}:${this.udpTarget.port}`);
      } else {
        logger.warn(`Malformed UDP handshake: "${message}"`);
      }
      return;
    }

    // Commands
    switch (message) {
      case 'info':
        this.handleInfoCommand();
        break;
      case 'reboot':
        this.handleRebootCommand();
        break;
      default:
        logger.warn(`Unknown command: "${message}"`);
        this.tcpSocket.write('Invalid command.\n');
    }
  }

  private async handleInfoCommand(): Promise<void> {
    try {
      logger.info('Info command received — gathering system info…');
      const info = await getSystemInfo();
      const payload = JSON.stringify(info);
      const chunks = chunkString(payload, TCP_CHUNK_SIZE);
      chunks.forEach((chunk) => this.tcpSocket.write(chunk));
      logger.success(`System info sent (${chunks.length} chunk${chunks.length > 1 ? 's' : ''})`);
    } catch (err) {
      logger.error('Failed to get system info', err);
      this.tcpSocket.write(JSON.stringify({ error: (err as Error).message }));
    }
  }

  private handleRebootCommand(): void {
    logger.warn('Reboot command received — system will restart shortly.');
    this.tcpSocket.write('System rebooting…\n');
    setTimeout(() => rebootSystem(), 500);
  }

  /** Starts periodic system monitoring and sends UDP alerts when thresholds are exceeded. */
  startMonitoring(): void {
    if (this.monitorInterval) return; // Already running

    this.monitorInterval = setInterval(async () => {
      try {
        const info = await getSystemInfo();
        const cpuAlert = info.cpu.usedCpu >= ALERT_THRESHOLD;
        const memAlert = info.memory.memoryUsagePercentage >= ALERT_THRESHOLD;

        if (!cpuAlert && !memAlert) return;
        if (!this.udpTarget) {
          logger.warn('Alert triggered but no UDP target set. Skipping.');
          return;
        }

        this.alertCounter++;
        const lines: string[] = [`Alert #${this.alertCounter}:`];
        if (cpuAlert) lines.push(`  CPU usage: ${info.cpu.usedCpu.toFixed(1)}%`);
        if (memAlert) lines.push(`  Memory usage: ${info.memory.memoryUsagePercentage.toFixed(1)}%`);

        const alertBuffer = Buffer.from(lines.join('\n'));

        // Reuse the persistent UDP socket — no create/close overhead per alert
        this.udpClient.send(
          alertBuffer, 0, alertBuffer.length,
          this.udpTarget.port, this.udpTarget.address,
          (err) => {
            if (err) logger.error('Failed to send UDP alert', err);
            else logger.warn(`Alert #${this.alertCounter} sent via UDP`);
          }
        );
      } catch (err) {
        logger.error('Monitor cycle error', err);
      }
    }, MONITOR_INTERVAL_MS);
  }

  /** Cleans up resources when the central manager disconnects. */
  cleanup(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.udpClient.close();
    logger.info('Agent event handler cleaned up.');
  }
}
