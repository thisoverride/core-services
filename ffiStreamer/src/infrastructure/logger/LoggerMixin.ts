import winston, { transports, format, Logger } from 'winston';
import type { LoggerOptions } from 'winston';
import { override } from '../../decorator/utils';

export default class LoggerMixin extends Logger {
  constructor (options?: LoggerOptions) {
    super(options);
    this.inizalizeLogger();
  }

  private inizalizeLogger (): void {
    this.configure({
      level: 'info',
      format: format.combine(
        format.timestamp(),
        format.printf(({ level, message }) => {
          let coloredMessage = message;
          if (level === 'info') {
            coloredMessage = `\u001b[34m${message}\u001b[0m`; // Blue color for 'info' level
          } else if (level === 'error') {
            coloredMessage = `\u001b[31m${message}\u001b[0m`; // Red color for 'error' level
          }
          return coloredMessage;
        })
      ),
      transports: [
        new transports.Console(),
        new winston.transports.File({
          filename: 'logs/app.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(({ level, message, timestamp }) => {
              return `${timestamp} ${level}-- ${message}`;
            })
          )
        })
      ]
    });
  }

  @override('info')
  public logInfo (_message: string, _additionalInfo?: string | any): void {
    // This method is overridden by the decorator
  }

  @override('error')
  public logError (_message: string, _additionalInfo?: string | any): void {
    // This method is overridden by the decorator
  }

  @override('warn')
  public logWarn (_message: string, _additionalInfo?: string | any): void {
    // This method is overridden by the decorator
  }
}