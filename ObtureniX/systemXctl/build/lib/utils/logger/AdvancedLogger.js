"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const fs = __importStar(require("fs"));
class AdvancedLogger {
    constructor() { }
    static createLogDirectory() {
        if (!fs.existsSync(this.LOG_DIR)) {
            fs.mkdirSync(this.LOG_DIR, { recursive: true });
        }
    }
    static createLogger() {
        return winston_1.default.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston_1.default.format.combine(winston_1.default.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.json()),
            defaultMeta: {
                service: 'photobooth-system',
                environment: process.env.NODE_ENV
            },
            transports: [
                new winston_daily_rotate_file_1.default({
                    filename: `${this.LOG_DIR}/error-%DATE%.log`,
                    datePattern: 'YYYY-MM-DD',
                    level: 'error',
                    maxSize: this.MAX_SIZE,
                    maxFiles: this.MAX_FILES,
                    format: this.getLogFormat()
                }),
                new winston_daily_rotate_file_1.default({
                    filename: `${this.LOG_DIR}/combined-%DATE%.log`,
                    datePattern: 'YYYY-MM-DD',
                    maxSize: this.MAX_SIZE,
                    maxFiles: this.MAX_FILES,
                    format: this.getLogFormat()
                })
            ]
        });
    }
    static getLogFormat() {
        return winston_1.default.format.combine(winston_1.default.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }), winston_1.default.format.printf(({ level, message, timestamp, ...meta }) => {
            let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
            if (Object.keys(meta).length > 0) {
                const { service, environment, ...relevantMeta } = meta;
                if (Object.keys(relevantMeta).length > 0) {
                    logMessage += ` | ${JSON.stringify(relevantMeta)}`;
                }
            }
            return logMessage;
        }));
    }
    static addConsoleTransport() {
        this.logger.add(new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple(), winston_1.default.format.printf(({ level, message, timestamp, ...meta }) => {
                let logMessage = `${timestamp} [${level}]: ${message}`;
                if (Object.keys(meta).length > 0) {
                    const { service, environment, ...relevantMeta } = meta;
                    if (Object.keys(relevantMeta).length > 0) {
                        logMessage += ` | ${JSON.stringify(relevantMeta, null, 2)}`;
                    }
                }
                return logMessage;
            }))
        }));
    }
    static info(message, meta) {
        this.logger.info(message, { ...meta, timestamp: new Date().toISOString() });
    }
    static warn(message, meta) {
        this.logger.warn(message, { ...meta, timestamp: new Date().toISOString() });
    }
    static error(message, meta) {
        this.logger.error(message, {
            ...meta,
            timestamp: new Date().toISOString(),
            trace: new Error().stack
        });
    }
    static debug(message, meta) {
        this.logger.debug(message, { ...meta, timestamp: new Date().toISOString() });
    }
    static getLogger() {
        return this.logger;
    }
    static setLogLevel(level) {
        this.logger.level = level;
    }
    static clearLogFiles() {
        if (fs.existsSync(this.LOG_DIR)) {
            fs.readdirSync(this.LOG_DIR).forEach(file => {
                const path = `${this.LOG_DIR}/${file}`;
                fs.unlinkSync(path);
            });
        }
    }
}
AdvancedLogger.LOG_DIR = 'logs';
AdvancedLogger.MAX_SIZE = '5m';
AdvancedLogger.MAX_FILES = '14d';
(() => {
    AdvancedLogger.createLogDirectory();
    AdvancedLogger.logger = AdvancedLogger.createLogger();
    if (process.env.NODE_ENV !== 'production') {
        AdvancedLogger.addConsoleTransport();
    }
})();
exports.default = AdvancedLogger;
//# sourceMappingURL=AdvancedLogger.js.map