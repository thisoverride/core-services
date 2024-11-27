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
exports.SystemXControl = void 0;
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const AdvancedLogger_1 = __importDefault(require("./utils/logger/AdvancedLogger"));
const SystemError_1 = require("./utils/error/SystemError");
const async_mutex_1 = require("async-mutex");
class SystemXControl {
    constructor() {
        if (process.getuid() !== 0) {
            throw new SystemError_1.SystemError('Root privileges required', 'SYSTEM_ROOT_REQUIRED');
        }
    }
    static async getStatus() {
        try {
            const temperature = await this.readTemperature();
            const diskSpace = await this.getDiskSpace();
            const cpuUsage = await this.getCPUUsage();
            return {
                uptime: os.uptime(),
                loadAverage: os.loadavg(),
                totalMemory: os.totalmem(),
                freeMemory: os.freemem(),
                cpuUsage,
                temperature,
                diskSpace
            };
        }
        catch (error) {
            AdvancedLogger_1.default.error('Failed to get system status', { error });
        }
    }
    static async sleep() {
        return this.commandMutex.runExclusive(async () => {
            try {
                this.validateStateTransition('isSleeping');
                const hasSystemctl = await this.checkCommand('systemctl');
                if (hasSystemctl) {
                    await this.spawnCommand('systemctl', ['suspend']);
                }
                else {
                    const hasPmSuspend = await this.checkCommand('pm-suspend');
                    if (!hasPmSuspend) {
                        throw new SystemError_1.SystemError('No suspend command available', 'SYSTEM_SUSPEND_UNAVAILABLE');
                    }
                    await this.spawnCommand('pm-suspend', []);
                }
            }
            catch (error) {
                AdvancedLogger_1.default.error('Failed to suspend system', { error });
                throw this.wrapError(error);
            }
            finally {
                this.systemState.isSleeping = false;
            }
        });
    }
    static async restart() {
        return this.commandMutex.runExclusive(async () => {
            try {
                this.validateStateTransition('isRestarting');
                await this.spawnCommand('shutdown', ['-r', '+1']);
            }
            catch (error) {
                AdvancedLogger_1.default.error('Failed to restart system', { error });
                throw this.wrapError(error);
            }
        });
    }
    static async shutdown() {
        return this.commandMutex.runExclusive(async () => {
            try {
                this.validateStateTransition('isShuttingDown');
                await this.spawnCommand('shutdown', ['-h', '+1']);
            }
            catch (error) {
                AdvancedLogger_1.default.error('Failed to shutdown system', { error });
                throw this.wrapError(error);
            }
        });
    }
    static async cancelShutdown() {
        return this.commandMutex.runExclusive(async () => {
            try {
                await this.spawnCommand('shutdown', ['-c']);
                this.resetSystemState();
            }
            catch (error) {
                AdvancedLogger_1.default.error('Failed to cancel shutdown', { error });
                throw this.wrapError(error);
            }
        });
    }
    static async healthCheck() {
        try {
            const [diskCheck, memoryCheck, cpuCheck] = await Promise.all([
                this.checkDiskSpace(),
                this.checkMemory(),
                this.checkCPU()
            ]);
            const allHealthy = [diskCheck, memoryCheck, cpuCheck].every(check => check.healthy);
            return {
                healthy: allHealthy,
                message: allHealthy ? 'System is healthy' : 'System health check failed',
                checks: [diskCheck, memoryCheck, cpuCheck]
            };
        }
        catch (error) {
            AdvancedLogger_1.default.error('Health check failed', { error });
            throw this.wrapError(error);
        }
    }
    static validateCommandAndArgs(command, args) {
        const allowedArgs = this.ALLOWED_COMMANDS[command];
        if (!allowedArgs) {
            throw new SystemError_1.SystemError('Command not allowed', 'SYSTEM_COMMAND_NOT_ALLOWED');
        }
        if (allowedArgs.length > 0 && !args.every(arg => allowedArgs.includes(arg))) {
            throw new SystemError_1.SystemError('Command arguments not allowed', 'SYSTEM_COMMAND_ARGS_NOT_ALLOWED');
        }
    }
    static async spawnCommand(command, args) {
        this.validateCommandAndArgs(command, args);
        return new Promise((resolve, reject) => {
            let output = '';
            let error = '';
            const process = (0, child_process_1.spawn)(command, args, { stdio: 'pipe' });
            const timeout = setTimeout(() => {
                process.kill();
                reject(new SystemError_1.SystemError('Command timeout', 'SYSTEM_COMMAND_TIMEOUT'));
            }, this.COMMAND_TIMEOUT);
            process.stdout.on('data', (data) => {
                output += data.toString();
            });
            process.stderr.on('data', (data) => {
                error += data.toString();
            });
            process.on('close', (code) => {
                clearTimeout(timeout);
                if (code === 0) {
                    AdvancedLogger_1.default.info('Command executed successfully', { command, args });
                    resolve(output.trim());
                }
                else {
                    reject(new SystemError_1.SystemError(`Command failed with code ${code}: ${error}`, 'SYSTEM_COMMAND_FAILED'));
                }
            });
            process.on('error', (err) => {
                clearTimeout(timeout);
                reject(new SystemError_1.SystemError(`Command execution error: ${err.message}`, 'SYSTEM_COMMAND_FAILED'));
            });
        });
    }
    static async readTemperature() {
        try {
            const tempOutput = await this.spawnCommand('cat', [this.THERMAL_PATH]);
            return parseInt(tempOutput) / 1000;
        }
        catch {
            return undefined;
        }
    }
    static async getDiskSpace() {
        const output = await this.spawnCommand('df', ['/', '--output=size,used,avail']);
        const lines = output.trim().split('\n');
        const [total, used, free] = lines[1].trim().split(/\s+/).map(x => parseInt(x) * 1024);
        return { total, used, free };
    }
    static async getCPUUsage() {
        const output = await this.spawnCommand('top', ['-bn1']);
        const cpuLine = output.split('\n').find(line => line.includes('Cpu(s)'));
        if (!cpuLine) {
            throw new SystemError_1.SystemError('Failed to parse CPU usage', 'SYSTEM_PARSE_ERROR');
        }
        return parseFloat(cpuLine.split(',')[0].split(':')[1]);
    }
    static async checkCommand(command) {
        try {
            await this.spawnCommand('which', [command]);
            return true;
        }
        catch {
            return false;
        }
    }
    static async checkDiskSpace() {
        const { total, used } = await this.getDiskSpace();
        const percentageUsed = (used / total) * 100;
        return {
            component: 'disk',
            healthy: percentageUsed < this.HEALTH_THRESHOLDS.DISK_USAGE,
            details: { percentageUsed }
        };
    }
    static checkMemory() {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const percentageUsed = ((totalMemory - freeMemory) / totalMemory) * 100;
        return {
            component: 'memory',
            healthy: percentageUsed < this.HEALTH_THRESHOLDS.MEMORY_USAGE,
            details: { percentageUsed }
        };
    }
    static async checkCPU() {
        const cpuUsage = await this.getCPUUsage();
        return {
            component: 'cpu',
            healthy: cpuUsage < this.HEALTH_THRESHOLDS.CPU_USAGE,
            details: { cpuUsage }
        };
    }
    static resetSystemState() {
        this.systemState = {
            isShuttingDown: false,
            isRestarting: false,
            isSleeping: false
        };
    }
    static validateStateTransition(action) {
        if (Object.values(this.systemState).some(state => state)) {
            throw new SystemError_1.SystemError('Invalid system state transition', 'SYSTEM_STATE_TRANSITION_INVALID');
        }
        this.systemState[action] = true;
    }
    static wrapError(error) {
        if (error instanceof SystemError_1.SystemError) {
            return error;
        }
        return new SystemError_1.SystemError(error.message || 'Unknown error occurred', 'SYSTEM_UNKNOWN_ERROR');
    }
}
exports.SystemXControl = SystemXControl;
SystemXControl.COMMAND_TIMEOUT = 5000;
SystemXControl.HEALTH_THRESHOLDS = {
    DISK_USAGE: 90,
    MEMORY_USAGE: 95,
    CPU_USAGE: 90
};
SystemXControl.THERMAL_PATH = '/sys/class/thermal/thermal_zone0/temp';
SystemXControl.commandMutex = new async_mutex_1.Mutex();
SystemXControl.systemState = {
    isShuttingDown: false,
    isRestarting: false,
    isSleeping: false
};
SystemXControl.ALLOWED_COMMANDS = {
    'shutdown': ['-h', '-r', '-c'],
    'systemctl': ['suspend'],
    'pm-suspend': [],
    'whoami': [],
    'top': ['-bn1'],
    'df': ['/', '--output=size,used,avail'],
    'which': [],
    'cat': [SystemXControl.THERMAL_PATH]
};
//# sourceMappingURL=SystemXControl.js.map