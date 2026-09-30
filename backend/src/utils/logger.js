/**
 * MOTORSYNC Backend — Logger
 * 
 * Structured logging for startup, data ingestion, validation failures,
 * database operations, offline analysis, and AI inference.
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

class Logger {
  constructor(level = 'info') {
    this.currentLevel = LOG_LEVELS[level.toLowerCase()] ?? LOG_LEVELS.info;
  }

  _format(level, message, meta) {
    const timestamp = new Date().toISOString();
    const metaStr = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  debug(message, meta) {
    if (this.currentLevel <= LOG_LEVELS.debug) {
      console.debug(this._format('debug', message, meta));
    }
  }

  info(message, meta) {
    if (this.currentLevel <= LOG_LEVELS.info) {
      console.log(this._format('info', message, meta));
    }
  }

  warn(message, meta) {
    if (this.currentLevel <= LOG_LEVELS.warn) {
      console.warn(this._format('warn', message, meta));
    }
  }

  error(message, error, meta = {}) {
    if (this.currentLevel <= LOG_LEVELS.error) {
      const errInfo = error instanceof Error ? { message: error.message, stack: error.stack } : error;
      console.error(this._format('error', message, { ...meta, error: errInfo }));
    }
  }
}

export const logger = new Logger(process.env.LOG_LEVEL || 'info');
