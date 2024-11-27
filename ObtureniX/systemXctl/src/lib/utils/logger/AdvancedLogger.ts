import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as fs from 'fs';

export default class AdvancedLogger {
  private static readonly LOG_DIR = 'logs';
  private static readonly MAX_SIZE = '5m';
  private static readonly MAX_FILES = '14d';
  private static logger: winston.Logger;

  private constructor() {}

  static {
    AdvancedLogger.createLogDirectory();
    AdvancedLogger.logger = AdvancedLogger.createLogger();

    if (process.env.NODE_ENV !== 'production') {
      AdvancedLogger.addConsoleTransport();
    }
  }

  private static createLogDirectory(): void {
    if (!fs.existsSync(this.LOG_DIR)) {
      fs.mkdirSync(this.LOG_DIR, { recursive: true });
    }
  }

  private static createLogger(): winston.Logger {
    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'photobooth-system',
        environment: process.env.NODE_ENV
      },
      transports: [
        // Rotation quotidienne des logs d'erreur
        new DailyRotateFile({
          filename: `${this.LOG_DIR}/error-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: this.MAX_SIZE,
          maxFiles: this.MAX_FILES,
          format: this.getLogFormat()
        }),
        // Rotation quotidienne des logs combinés
        new DailyRotateFile({
          filename: `${this.LOG_DIR}/combined-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: this.MAX_SIZE,
          maxFiles: this.MAX_FILES,
          format: this.getLogFormat()
        })
      ]
    });
  }

  private static getLogFormat() {
    return winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.printf(({ level, message, timestamp, ...meta }) => {
        let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
        
        if (Object.keys(meta).length > 0) {
          // Exclusion des métadonnées par défaut
          const { service, environment, ...relevantMeta } = meta;
          if (Object.keys(relevantMeta).length > 0) {
            logMessage += ` | ${JSON.stringify(relevantMeta)}`;
          }
        }
        
        return logMessage;
      })
    );
  }

  private static addConsoleTransport(): void {
    this.logger.add(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
          winston.format.printf(({ level, message, timestamp, ...meta }) => {
            let logMessage = `${timestamp} [${level}]: ${message}`;
            
            if (Object.keys(meta).length > 0) {
              const { service, environment, ...relevantMeta } = meta;
              if (Object.keys(relevantMeta).length > 0) {
                logMessage += ` | ${JSON.stringify(relevantMeta, null, 2)}`;
              }
            }
            
            return logMessage;
          })
        )
      })
    );
  }

  // Interface publique pour le logging
  public static info(message: string, meta?: Record<string, any>): void {
    this.logger.info(message, { ...meta, timestamp: new Date().toISOString() });
  }

  public static warn(message: string, meta?: Record<string, any>): void {
    this.logger.warn(message, { ...meta, timestamp: new Date().toISOString() });
  }

  public static error(message: string, meta?: Record<string, any>): void {
    this.logger.error(message, {
      ...meta,
      timestamp: new Date().toISOString(),
      trace: new Error().stack
    });
  }

  public static debug(message: string, meta?: Record<string, any>): void {
    this.logger.debug(message, { ...meta, timestamp: new Date().toISOString() });
  }

  // Méthodes utilitaires
  public static getLogger(): winston.Logger {
    return this.logger;
  }

  public static setLogLevel(level: string): void {
    this.logger.level = level;
  }

  public static clearLogFiles(): void {
    if (fs.existsSync(this.LOG_DIR)) {
      fs.readdirSync(this.LOG_DIR).forEach(file => {
        const path = `${this.LOG_DIR}/${file}`;
        fs.unlinkSync(path);
      });
    }
  }
}