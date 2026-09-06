import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import type {
  SystemInfo,
  OSInfo,
  MemoryInfo,
  CPUInfo,
  CPUUsageSample,
  ProcessInfo,
} from './types';

const execAsync = promisify(exec);

/**
 * Formats an uptime duration in seconds to a human-readable string.
 * Native zero-dependency implementation.
 */
export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (d > 0) parts.push(`${d} ${d === 1 ? 'day' : 'days'}`);
  if (h > 0) parts.push(`${h} ${h === 1 ? 'hour' : 'hours'}`);
  if (m > 0 && d === 0) parts.push(`${m} ${m === 1 ? 'minute' : 'minutes'}`);
  if (parts.length === 0) parts.push(`${s} ${s === 1 ? 'second' : 'seconds'}`);
  return parts.slice(0, 2).join(' and ');
}

/**
 * Captures a single CPU usage sample (idle + total ticks across all cores).
 */
function sampleCPU(): CPUUsageSample {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  for (const core of cpus) {
    const t = core.times;
    totalTick += t.user + t.nice + t.sys + t.idle + t.irq;
    totalIdle += t.idle;
  }

  return {
    idle: totalIdle / cpus.length,
    total: totalTick / cpus.length,
  };
}

/**
 * Measures CPU usage by sampling twice with a non-blocking async delay.
 */
export function measureCPUAsync(sampleIntervalMs = 500): Promise<number> {
  return new Promise((resolve) => {
    const start = sampleCPU();

    setTimeout(() => {
      const end = sampleCPU();
      const idleDiff = end.idle - start.idle;
      const totalDiff = end.total - start.total;

      if (totalDiff === 0) {
        resolve(0);
        return;
      }

      const usedCpu = +((1 - idleDiff / totalDiff) * 100).toFixed(2);
      resolve(usedCpu);
    }, sampleIntervalMs);
  });
}

/**
 * Parses raw process list output (tasklist / ps aux) into an array of objects.
 */
function parseProcessLines(lines: string[]): ProcessInfo[] {
  if (lines.length === 0) return [];

  const headers = lines[0]
    .trim()
    .split(/\s+/)
    .map((h) => h.toLowerCase());

  return lines.slice(1).map((line) => {
    const values = line.trim().match(/\S+/g) ?? [];
    const proc: ProcessInfo = {};
    headers.forEach((header, i) => {
      proc[header] = values[i] ?? '';
    });
    return proc;
  });
}

/**
 * Fetches the list of running system processes.
 * Uses `tasklist` on Windows and `ps aux` on Unix/Linux/macOS.
 */
export async function getSystemProcesses(): Promise<ProcessInfo[]> {
  const command = process.platform === 'win32' ? 'tasklist' : 'ps aux';

  try {
    const { stdout } = await execAsync(command);
    const lines = stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    return parseProcessLines(lines);
  } catch (error) {
    throw new Error(
      `Failed to fetch processes: ${(error as Error).message}`
    );
  }
}

/**
 * Collects a full system snapshot: OS info, CPU, memory, processes, network.
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  const osInfo: OSInfo = {
    platform: os.platform(),
    type: os.type(),
    release: os.release(),
    architecture: os.arch(),
    hostname: os.hostname(),
    uptime: formatUptime(os.uptime()),
  };

  const memoryInfo: MemoryInfo = {
    totalMemory: +(totalMem / 1_073_741_824).toFixed(2), // bytes -> GiB
    freeMemory: +(freeMem / 1_073_741_824).toFixed(2),
    usedMemory: +(usedMem / 1_073_741_824).toFixed(2),
    memoryUsagePercentage: +((usedMem / totalMem) * 100).toFixed(2),
  };

  // Run CPU measurement and process listing concurrently
  const [usedCpu, processes] = await Promise.all([
    measureCPUAsync(),
    getSystemProcesses(),
  ]);

  const cpuInfo: CPUInfo = {
    usedCpu,
    freeCpu: +(100 - usedCpu).toFixed(2),
    cores: cpus,
    model: cpus[0]?.model ?? 'Unknown',
    coreCount: cpus.length,
  };

  return {
    os: osInfo,
    memory: memoryInfo,
    cpu: cpuInfo,
    processes,
    networkInterfaces: os.networkInterfaces(),
  };
}

/**
 * Executes the OS reboot command.
 */
export function rebootSystem(): void {
  const command =
    process.platform === 'win32' ? 'shutdown /r /t 0' : 'sudo reboot';

  exec(command, (error) => {
    if (error) {
      throw new Error(`Reboot failed: ${error.message}`);
    }
  });
}

/**
 * Splits a string into chunks of at most `chunkSize` characters.
 * Used to send large JSON payloads over TCP without hitting buffer limits.
 */
export function chunkString(s: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < s.length; i += chunkSize) {
    chunks.push(s.slice(i, i + chunkSize));
  }
  return chunks;
}
