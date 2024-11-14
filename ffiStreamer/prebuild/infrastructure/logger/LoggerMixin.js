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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importStar(require("winston"));
const utils_1 = require("../../decorator/utils");
class LoggerMixin extends winston_1.Logger {
    constructor(options) {
        super(options);
        this.inizalizeLogger();
    }
    inizalizeLogger() {
        this.configure({
            level: 'info',
            format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.printf(({ level, message }) => {
                let coloredMessage = message;
                if (level === 'info') {
                    coloredMessage = `\u001b[34m${message}\u001b[0m`; // Blue color for 'info' level
                }
                else if (level === 'error') {
                    coloredMessage = `\u001b[31m${message}\u001b[0m`; // Red color for 'error' level
                }
                return coloredMessage;
            })),
            transports: [
                new winston_1.transports.Console(),
                new winston_1.default.transports.File({
                    filename: 'logs/app.log',
                    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.printf(({ level, message, timestamp }) => {
                        return `${timestamp} ${level}-- ${message}`;
                    }))
                })
            ]
        });
    }
    logInfo(_message, _additionalInfo) {
        // This method is overridden by the decorator
    }
    logError(_message, _additionalInfo) {
        // This method is overridden by the decorator
    }
    logWarn(_message, _additionalInfo) {
        // This method is overridden by the decorator
    }
}
exports.default = LoggerMixin;
__decorate([
    (0, utils_1.override)('info'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LoggerMixin.prototype, "logInfo", null);
__decorate([
    (0, utils_1.override)('error'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LoggerMixin.prototype, "logError", null);
__decorate([
    (0, utils_1.override)('warn'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LoggerMixin.prototype, "logWarn", null);
