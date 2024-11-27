"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemError = void 0;
class SystemError extends Error {
    constructor(message, code = 'SYSTEM_ERROR') {
        super(message);
        this.code = code;
        this.name = 'SystemError';
    }
}
exports.SystemError = SystemError;
//# sourceMappingURL=SystemError.js.map