// Using ANSI escape codes directly to avoid chalk ESM/CJS issues
const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const BLUE  = '\x1b[34m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED   = '\x1b[31m';
const MAGENTA = '\x1b[35m';
const CYAN  = '\x1b[36m';

function timestamp(): string {
  return new Date().toTimeString().slice(0, 8);
}

const logger = {
  info: (msg: string): void => {
    console.log(`${BLUE}${BOLD}[INFO]${RESET}  ${CYAN}${timestamp()}${RESET} ${msg}`);
  },

  success: (msg: string): void => {
    console.log(`${GREEN}${BOLD}[OK]${RESET}    ${CYAN}${timestamp()}${RESET} ${msg}`);
  },

  warn: (msg: string): void => {
    console.warn(`${YELLOW}${BOLD}[WARN]${RESET}  ${CYAN}${timestamp()}${RESET} ${msg}`);
  },

  error: (msg: string, err?: unknown): void => {
    console.error(`${RED}${BOLD}[ERROR]${RESET} ${CYAN}${timestamp()}${RESET} ${msg}`);
    if (err instanceof Error) {
      console.error(`         ${RED}${err.stack ?? err.message}${RESET}`);
    } else if (err !== undefined) {
      console.error(`         `, err);
    }
  },

  debug: (msg: string): void => {
    if (process.env.DEBUG === 'true') {
      console.debug(`${MAGENTA}${BOLD}[DEBUG]${RESET} ${CYAN}${timestamp()}${RESET} ${msg}`);
    }
  },
};

export default logger;
