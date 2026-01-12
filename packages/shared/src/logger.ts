import { Config } from './config';

const LOG_PRIORITY: Record<string, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** Safely stringify objects, handling circular references. */
function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return '[Circular or non-serializable]';
  }
}

/** Structured logger with context inheritance. */
export class Logger {
  private readonly config: Config;
  private readonly context: Record<string, unknown>;

  constructor(config: Config, context: Record<string, unknown> = {}) {
    this.config = config;
    this.context = context;
  }

  /** Creates child logger with additional context. */
  child(additionalContext: Record<string, unknown>): Logger {
    return new Logger(this.config, { ...this.context, ...additionalContext });
  }

  private shouldLog(level: string): boolean {
    const levelPriority = LOG_PRIORITY[level];
    const configPriority = LOG_PRIORITY[this.config.logLevel];
    if (levelPriority === undefined || configPriority === undefined) {
      return true; // Log if level is unknown
    }
    return levelPriority >= configPriority;
  }

  private formatMessage(message: string, meta?: Record<string, unknown>): string {
    const fullContext = { ...this.context, ...meta };
    const contextStr = Object.keys(fullContext).length > 0
      ? ` ${safeStringify(fullContext)}`
      : '';
    return `${message}${contextStr}`;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage(message, meta));
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage(message, meta));
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage(message, meta));
    }
  }

  error(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage(message, meta));
    }
  }

  success(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.info(`✓ ${this.formatMessage(message, meta)}`);
    }
  }
}