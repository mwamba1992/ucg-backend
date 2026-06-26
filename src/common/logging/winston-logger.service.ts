import { Injectable, LoggerService } from '@nestjs/common';
import * as path from 'path';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

/**
 * NestJS logger backed by Winston that routes every log to a per-channel daily-rotating
 * file based on the logger's CONTEXT name (the string passed to `new Logger(Context)`).
 *
 * Existing `new Logger(X.name)` calls across the app keep working untouched — they are
 * simply persisted to the right channel file instead of (only) the console.
 *
 * Channels: mpesa, tigopesa, airtel, normal (core payments), gl-credit (CBS transfers),
 * apef, app (everything else). All error-level records are additionally written to an
 * aggregate `error` log.
 */
@Injectable()
export class WinstonLoggerService implements LoggerService {
  private readonly loggers = new Map<string, winston.Logger>();
  private readonly errorLogger: winston.Logger;

  private readonly logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
  private readonly maxFiles = process.env.LOG_MAX_FILES || '30d';
  private readonly maxSize = process.env.LOG_MAX_SIZE || '20m';
  private readonly level =
    process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info');
  private readonly enableConsole =
    process.env.LOG_CONSOLE === 'true' || process.env.NODE_ENV === 'development';

  private static readonly CHANNELS = [
    'mpesa',
    'tigopesa',
    'airtel',
    'gl-credit',
    'apef',
    'normal',
    'app',
  ];

  constructor() {
    for (const channel of WinstonLoggerService.CHANNELS) {
      this.loggers.set(channel, this.buildLogger(channel));
    }
    this.errorLogger = this.buildLogger('error', 'error');
  }

  private buildLogger(channel: string, minLevel?: string): winston.Logger {
    const lineFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.printf((info: any) => {
        const ctx = info.context ? ` [${info.context}]` : '';
        const trace = info.trace ? `\n${info.trace}` : '';
        return `${info.timestamp} [${String(info.level).toUpperCase()}]${ctx} ${info.message}${trace}`;
      }),
    );

    const transports: winston.transport[] = [
      new (winston.transports as any).DailyRotateFile({
        dirname: path.join(this.logDir, channel),
        filename: '%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: this.maxSize,
        maxFiles: this.maxFiles,
        // append is the default; one file per day, rolled at midnight
      }),
    ];

    if (this.enableConsole) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(winston.format.colorize(), lineFormat),
        }),
      );
    }

    return winston.createLogger({
      level: minLevel || this.level,
      format: lineFormat,
      transports,
    });
  }

  /** Map a logger context name to its channel (first match wins). */
  private resolveChannel(context?: string): string {
    const c = (context || '').toLowerCase();
    if (c.includes('mpesa')) return 'mpesa';
    if (c.includes('tigo') || c.includes('mixx')) return 'tigopesa';
    if (c.includes('airtel')) return 'airtel';
    if (c.includes('cbs')) return 'gl-credit';
    if (c.includes('apef')) return 'apef';
    if (c.includes('payment')) return 'normal';
    return 'app';
  }

  private channelLogger(context?: string): winston.Logger {
    return this.loggers.get(this.resolveChannel(context)) || this.loggers.get('app')!;
  }

  private toMessage(message: any): string {
    if (typeof message === 'string') return message;
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }

  // ---- NestJS LoggerService interface ----

  log(message: any, context?: string) {
    this.channelLogger(context).info(this.toMessage(message), { context });
  }

  error(message: any, trace?: string, context?: string) {
    const msg = this.toMessage(message);
    this.channelLogger(context).error(msg, { context, trace });
    this.errorLogger.error(msg, { context, trace });
  }

  warn(message: any, context?: string) {
    this.channelLogger(context).warn(this.toMessage(message), { context });
  }

  debug(message: any, context?: string) {
    this.channelLogger(context).debug(this.toMessage(message), { context });
  }

  verbose(message: any, context?: string) {
    this.channelLogger(context).verbose(this.toMessage(message), { context });
  }
}
