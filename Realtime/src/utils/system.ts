import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import humanizeDuration from 'humanize-duration';

const execAsync = promisify(exec);

interface OSInfo {
  platform: string;
  type: string;
  release: string;
  architecture: string;
  hostname: string;
  uptime: string;
}

interface MemoryInfo {
  totalMemory: number;
  freeMemory: number;
  usedMemory: number;
  memoryUsagePercentage: number;
}

interface CPUInfo {
  usedCpu: number;
  freeCpu: number;
  cores: os.CpuInfo[];
}

interface CPUUsage {
  idle: number;
  total: number;
}

type ProcessInfo = Record<string, string>;

export interface SystemInfo {
  os: OSInfo;
  memory: MemoryInfo;
  cpu: CPUInfo;
  processes: ProcessInfo[];
  networkInterfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]>;
}

export class SystemUtilities {
  async getSystemInfo(): Promise<SystemInfo> {
    const osInfo: OSInfo = {
      platform: os.platform(),
      type: os.type(),
      release: os.release(),
      architecture: os.arch(),
      hostname: os.hostname(),
      uptime: humanizeDuration(os.uptime() * 1000, {
        round: true,
        conjunction: ' and ',
        serialComma: false,
      }),
    };

    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    const memInfo: MemoryInfo = {
      totalMemory: +(totalMem / 1_000_000_000).toFixed(2),
      freeMemory: +(freeMem / 1_000_000_000).toFixed(2),
      usedMemory: +((totalMem - freeMem) / 1_000_000_000).toFixed(2),
      memoryUsagePercentage: +(((totalMem - freeMem) / totalMem) * 100).toFixed(2),
    };

    const processes = await this.getSystemProcesses();
    const usedCpu = +this.calculateCPUPercentageSync();

    const cpuInfo: CPUInfo = {
      usedCpu,
      freeCpu: +(100 - usedCpu).toFixed(2),
      cores: os.cpus(),
    };

    return {
      os: osInfo,
      memory: memInfo,
      cpu: cpuInfo,
      processes,
      networkInterfaces: os.networkInterfaces(),
    };
  }

  async getSystemProcesses(): Promise<ProcessInfo[]> {
    const command = process.platform === 'win32' ? 'tasklist' : 'ps aux';

    try {
      const { stdout } = await execAsync(command);
      const lines = stdout
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
      return this.getJSONProcesses(lines);
    } catch (error) {
      throw new Error(`Failed to fetch processes: ${(error as Error).message}`);
    }
  }

  private getCPUUsage(): CPUUsage {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const core of cpus) {
      totalTick += Object.values(core.times).reduce((acc, time) => acc + time, 0);
      totalIdle += core.times.idle;
    }

    const cores = cpus.length;
    return {
      idle: totalIdle / cores,
      total: totalTick / cores,
    };
  }

  private calculateCPUPercentageSync(): string {
    const start = this.getCPUUsage();
    this.blockForMilliseconds(1000);
    const end = this.getCPUUsage();

    const idleDiff = end.idle - start.idle;
    const totalDiff = end.total - start.total;

    if (totalDiff === 0) return '0.00';
    return ((1 - idleDiff / totalDiff) * 100).toFixed(2);
  }

  private blockForMilliseconds(ms: number): void {
    const start = Date.now();
    while (Date.now() - start < ms);
  }

  private getJSONProcesses(processLines: string[]): ProcessInfo[] {
    const headers = processLines[0].split(/\s+/).map(h => h.toLowerCase());
    return processLines.slice(1).map(line => {
      const values = line.trim().match(/\S+/g) || [];
      const proc: ProcessInfo = {};
      headers.forEach((header, i) => {
        proc[header] = values[i] ?? '';
      });
      return proc;
    });
  }

  async rebootSystem(): Promise<void> {
    const command = process.platform === 'win32' ? 'shutdown /r /t 0' : 'sudo reboot';

    try {
      const { stderr } = await execAsync(command);
      if (stderr) throw new Error(`Error output: ${stderr}`);
    } catch (error) {
      throw new Error(`Error restarting system: ${(error as Error).message}`);
    }
  }
}