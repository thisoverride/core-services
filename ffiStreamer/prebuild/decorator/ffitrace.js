"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logInfo = void 0;
function logInfo(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args) {
        const event = propertyKey;
        this.logInfo(`${event}`);
        return originalMethod.apply(this, args);
    };
    return descriptor;
}
exports.logInfo = logInfo;
