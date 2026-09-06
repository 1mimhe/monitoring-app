// Re-exports from the shared utilities module.
// The actual implementation lives in shared/system.ts.
export { getSystemInfo, measureCPUAsync, getSystemProcesses, rebootSystem, chunkString } from '../../../shared/system';
export type { SystemInfo } from '../../../shared/types';