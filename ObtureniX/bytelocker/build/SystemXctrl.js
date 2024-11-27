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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const SystemError_1 = require("./utils/error/SystemError");
class SystemXctrl {
    static getStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let temperature;
                try {
                    const { stdout: tempOutput } = yield this.execSecure('cat /sys/class/thermal/thermal_zone0/temp');
                    temperature = parseInt(tempOutput) / 1000;
                }
                catch (error) {
                    temperature = undefined;
                }
                const { stdout: dfOutput } = yield this.execSecure('df / --output=size,used,avail');
                const dfLines = dfOutput.trim().split('\n');
                const [total, used, free] = dfLines[1].trim().split(/\s+/).map(x => parseInt(x) * 1024);
                const { stdout: cpuOutput } = yield this.execSecure('top -bn1 | grep "Cpu(s)" | awk \'{print $2}\'');
                const cpuUsage = parseFloat(cpuOutput);
                const status = {
                    uptime: os.uptime(),
                    loadAverage: os.loadavg(),
                    totalMemory: os.totalmem(),
                    freeMemory: os.freemem(),
                    cpuUsage,
                    temperature,
                    diskSpace: {
                        total,
                        used,
                        free
                    }
                };
                return status;
            }
            catch (error) {
                throw this.wrapError(error);
            }
        });
    }
    static sleep() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.validateStateTransition('isSleeping');
                const { stdout: hasSystemctl } = yield this.execSecure('which systemctl');
                if (hasSystemctl) {
                    yield this.execWithLogging('systemctl suspend');
                }
                else {
                    yield this.execWithLogging('pm-suspend');
                }
            }
            catch (error) {
                throw this.wrapError(error);
            }
            finally {
                this.systemState.isSleeping = false;
            }
        });
    }
    static restart() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.validateStateTransition('isRestarting');
                yield this.checkRootPermissions();
                yield this.execWithLogging('shutdown -r +1 "System will restart in 1 minute"');
            }
            catch (error) {
                throw this.wrapError(error);
            }
        });
    }
    static shutdown() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.validateStateTransition('isShuttingDown');
                yield this.checkRootPermissions();
                yield this.execWithLogging('shutdown -h +1 "System will shutdown in 1 minute"');
            }
            catch (error) {
                throw this.wrapError(error);
            }
        });
    }
    static cancelShutdown() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.execWithLogging('shutdown -c');
                this.systemState.isShuttingDown = false;
                this.systemState.isRestarting = false;
            }
            catch (error) {
                throw this.wrapError(error);
            }
        });
    }
    static healthCheck() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const checks = yield Promise.all([
                    this.checkDiskSpace(),
                    this.checkMemory(),
                    this.checkCPU()
                ]);
                const allHealthy = checks.every(check => check.healthy);
                const result = {
                    healthy: allHealthy,
                    message: allHealthy ? 'System is healthy' : 'System health check failed',
                    checks
                };
                return result;
            }
            catch (error) {
                throw this.wrapError(error);
            }
        });
    }
    static validateStateTransition(action) {
        if (Object.values(this.systemState).some(state => state)) {
            throw new SystemError_1.SystemError('Invalid system state transition', 'SYSTEM_STATE_TRANSITION_INVALID');
        }
        this.systemState[action] = true;
    }
    static checkRootPermissions() {
        return __awaiter(this, void 0, void 0, function* () {
            const { stdout: whoami } = yield this.execSecure('whoami');
            if (whoami.trim() !== 'root') {
                throw new SystemError_1.SystemError('Root permissions required', 'SYSTEM_ROOT_REQUIRED');
            }
        });
    }
    static validateCommand(command) {
        const allowedCommands = [
            'shutdown',
            'systemctl',
            'pm-suspend',
            'whoami',
            'top',
            'df',
            'cat /sys/class/thermal/thermal_zone0/temp'
        ];
        const commandName = command.split(' ')[0];
        return allowedCommands.includes(commandName);
    }
    static execSecure(command) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.validateCommand(command)) {
                throw new SystemError_1.SystemError('Command not allowed', 'SYSTEM_COMMAND_NOT_ALLOWED');
            }
            return this.execWithTimeout(command);
        });
    }
    static execWithTimeout(command) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield Promise.race([
                    this.execAsync(command),
                    new Promise((_, reject) => setTimeout(() => reject(new SystemError_1.SystemError('Command timeout', 'SYSTEM_COMMAND_TIMEOUT')), this.COMMAND_TIMEOUT))
                ]);
            }
            catch (error) {
                throw new SystemError_1.SystemError('Command execution failed', 'SYSTEM_COMMAND_FAILED');
            }
        });
    }
    static execWithLogging(command) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.execWithRetry(command);
                return result;
            }
            catch (error) {
                throw error;
            }
        });
    }
    static execWithRetry(command_1) {
        return __awaiter(this, arguments, void 0, function* (command, retries = 3) {
            for (let i = 0; i < retries; i++) {
                try {
                    return yield this.execSecure(command);
                }
                catch (error) {
                    if (i === retries - 1)
                        throw error;
                    yield new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                }
            }
            throw new SystemError_1.SystemError('Max retries reached', 'SYSTEM_MAX_RETRIES_REACHED');
        });
    }
    static checkDiskSpace() {
        return __awaiter(this, void 0, void 0, function* () {
            const { stdout } = yield this.execSecure('df / --output=size,used,avail');
            const dfLines = stdout.trim().split('\n');
            const [total, used] = dfLines[1].trim().split(/\s+/).map(x => parseInt(x) * 1024);
            const percentageUsed = (used / total) * 100;
            return {
                component: 'disk',
                healthy: percentageUsed < 90,
                details: { percentageUsed }
            };
        });
    }
    static checkMemory() {
        return __awaiter(this, void 0, void 0, function* () {
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            const percentageUsed = ((totalMemory - freeMemory) / totalMemory) * 100;
            return {
                component: 'memory',
                healthy: percentageUsed < 95,
                details: { percentageUsed }
            };
        });
    }
    static checkCPU() {
        return __awaiter(this, void 0, void 0, function* () {
            const { stdout } = yield this.execSecure('top -bn1 | grep "Cpu(s)" | awk \'{print $2}\'');
            const cpuUsage = parseFloat(stdout);
            return {
                component: 'cpu',
                healthy: cpuUsage < 90,
                details: {
                    percentageUsed: cpuUsage,
                    cpuUsage
                }
            };
        });
    }
    static wrapError(error) {
        if (error instanceof SystemError_1.SystemError) {
            return error;
        }
        return new SystemError_1.SystemError(error.message || 'Unknown error occurred');
    }
}
SystemXctrl.COMMAND_TIMEOUT = 5000;
SystemXctrl.execAsync = (0, util_1.promisify)(child_process_1.exec);
SystemXctrl.systemState = {
    isShuttingDown: false,
    isRestarting: false,
    isSleeping: false
};
exports.default = SystemXctrl;
