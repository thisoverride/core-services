import winston from 'winston';
export default class AdvancedLogger {
    private static readonly LOG_DIR;
    private static readonly MAX_SIZE;
    private static readonly MAX_FILES;
    private static logger;
    private constructor();
    private static createLogDirectory;
    private static createLogger;
    private static getLogFormat;
    private static addConsoleTransport;
    static info(message: string, meta?: Record<string, any>): void;
    static warn(message: string, meta?: Record<string, any>): void;
    static error(message: string, meta?: Record<string, any>): void;
    static debug(message: string, meta?: Record<string, any>): void;
    static getLogger(): winston.Logger;
    static setLogLevel(level: string): void;
    static clearLogFiles(): void;
}
//# sourceMappingURL=AdvancedLogger.d.ts.map