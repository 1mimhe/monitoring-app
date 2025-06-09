import chalk from 'chalk';

export default {
  info: (msg: string) => {
    console.log(`${chalk.blue('[INFO]')} ${msg}`);
  },

  success: (msg: string) => {
    console.log(`${chalk.green('[SUCCESS]')} ${msg}`);
  },

  warn: (msg: string) => {
    console.warn(`${chalk.yellow('[WARN]')} ${msg}`);
  },

  error: (msg: string, err?: unknown) => {
    console.error(`${chalk.red('[ERROR]')} ${msg}`);
    if (err) console.error(err);
  },

  debug: (msg: string) => {
    if (process.env.DEBUG === 'true') {
      console.debug(`${chalk.magenta('[DEBUG]')} ${msg}`);
    }
  },
};
