"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.override = void 0;
const date_fns_1 = require("date-fns");
const override = (level) => {
    return function (_target, _propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        const logMethod = function (...args) {
            const currentTimestamp = (0, date_fns_1.format)(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS');
            const message = args[0] || '';
            const additionalInfo = args[1] || '';
            const levelMappings = {
                warn: 'WARNING',
                info: 'INFO',
                error: 'ERROR',
                debug: 'DEBUG'
            };
            const normalizedLevel = level.toLowerCase();
            const levelColors = {
                warn: '\u001b[93m', // Yellow for 'warn'
                info: '\u001b[34m', // Blue for 'info'
                error: '\u001b[31m', // Red for 'error'
                debug: '\u001b[90m' // Gray for 'debug'
            };
            if (!levelMappings[level.toLowerCase()]) {
                level = 'info';
            }
            const formattedLevel = levelMappings[normalizedLevel] || levelMappings['info'];
            const levelColor = levelColors[normalizedLevel] || levelColors['info'];
            const formattedMessage = `\u001b[0m${currentTimestamp} ${levelColor}${formattedLevel}\u001b[0m -- ${message} ${additionalInfo}`;
            this.log(level, formattedMessage);
        };
        descriptor.value = logMethod;
        return descriptor;
    };
};
exports.override = override;
