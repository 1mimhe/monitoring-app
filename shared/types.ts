import * as os from 'os';

export interface OSInfo {
  platform: string;
  type: string;
  release: string;
  architecture: string;
  hostname: string;
  uptime: string;
}

export interface MemoryInfo {
  totalMemory: number;
  freeMemory: number;
  usedMemory: number;
  memoryUsagePercentage: number;
}

export interface CPUInfo {
  usedCpu: number;
  freeCpu: number;
  cores: os.CpuInfo[];
  model: string;
  coreCount: number;
}

export interface CPUUsageSample {
  idle: number;
  total: number;
}

export type ProcessInfo = Record<string, string>;

export interface SystemInfo {
  os: OSInfo;
  memory: MemoryInfo;
  cpu: CPUInfo;
  processes: ProcessInfo[];
  networkInterfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]>;
}
