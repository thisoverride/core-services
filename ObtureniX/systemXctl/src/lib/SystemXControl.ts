import * as os from 'os';
import { spawn } from 'child_process';
import AdvancedLogger  from './utils/logger/AdvancedLogger';
import { HealthCheck, HealthCheckResult, SystemState, SystemStatus } from '../../@type/global';
import { SystemError } from './utils/error/SystemError';
import { Mutex } from 'async-mutex';

export class SystemXControl {
  private static readonly COMMAND_TIMEOUT = 5000;
  private static readonly HEALTH_THRESHOLDS = {
    DISK_USAGE: 90,
    MEMORY_USAGE: 95,
    CPU_USAGE: 90
  };
  private static readonly THERMAL_PATH = '/sys/class/thermal/thermal_zone0/temp';
  private static readonly commandMutex = new Mutex();
  
  private static systemState: SystemState = {
    isShuttingDown: false,
    isRestarting: false,
    isSleeping: false
  };

  private static readonly ALLOWED_COMMANDS: Record<string, string[]> = {
    'shutdown': ['-h', '-r', '-c','now'],
    'systemctl': ['suspend'],
    'pm-suspend': [],
    'whoami': [],
    'top': ['-bn1'],
    'df': ['/', '--output=size,used,avail'],
    'which': [],
    'cat': [SystemXControl.THERMAL_PATH]
  };

  constructor() {
    //@ts-ignore
    if (process.getuid() !== 0) {
      throw new SystemError('Root privileges required', 'SYSTEM_ROOT_REQUIRED');
    }
  }

  public static async getStatus(): Promise<SystemStatus> {
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
    } catch (error) {
      AdvancedLogger.error('Failed to get system status', { error });
      throw this.wrapError(error);
    }
  }

  public static async sleep(): Promise<void> {
    return this.commandMutex.runExclusive(async () => {
      try {
        this.validateStateTransition('isSleeping');
        
        const hasSystemctl = await this.checkCommand('systemctl');
        if (hasSystemctl) {
          await this.spawnCommand('systemctl', ['suspend']);
        } else {
          const hasPmSuspend = await this.checkCommand('pm-suspend');
          if (!hasPmSuspend) {
            throw new SystemError('No suspend command available', 'SYSTEM_SUSPEND_UNAVAILABLE');
          }
          await this.spawnCommand('pm-suspend', []);
        }
      } catch (error) {
        AdvancedLogger.error('Failed to suspend system', { error });
        throw this.wrapError(error);
      } finally {
        this.systemState.isSleeping = false;
      }
    });
  }

  public static async restart(): Promise<void> {
    return this.commandMutex.runExclusive(async () => {
      try {
        this.validateStateTransition('isRestarting');
        await this.spawnCommand('shutdown', ['-r', 'now']);
      } catch (error) {
        AdvancedLogger.error('Failed to restart system', { error });
        throw this.wrapError(error);
      }
    });
  }

  public static async shutdown(): Promise<void> {
    return this.commandMutex.runExclusive(async () => {
      try {
        this.validateStateTransition('isShuttingDown');
        await this.spawnCommand('shutdown', ['-h', 'now']);
      } catch (error) {
        AdvancedLogger.error('Failed to shutdown system', { error });
        throw this.wrapError(error);
      }
    });
  }

  public static async cancelShutdown(): Promise<void> {
    return this.commandMutex.runExclusive(async () => {
      try {
        await this.spawnCommand('shutdown', ['-c']);
        this.resetSystemState();
      } catch (error) {
        AdvancedLogger.error('Failed to cancel shutdown', { error });
        throw this.wrapError(error);
      }
    });
  }

  public static async healthCheck(): Promise<HealthCheckResult> {
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
    } catch (error) {
      AdvancedLogger.error('Health check failed', { error });
      throw this.wrapError(error);
    }
  }

  private static validateCommandAndArgs(command: string, args: string[]): void {
    const allowedArgs = this.ALLOWED_COMMANDS[command];
    if (!allowedArgs) {
      throw new SystemError('Command not allowed', 'SYSTEM_COMMAND_NOT_ALLOWED');
    }

    if (allowedArgs.length > 0 && !args.every(arg => allowedArgs.includes(arg))) {
      throw new SystemError('Command arguments not allowed', 'SYSTEM_COMMAND_ARGS_NOT_ALLOWED');
    }
  }

  private static async spawnCommand(command: string, args: string[]): Promise<string> {
    this.validateCommandAndArgs(command, args);

    return new Promise((resolve, reject) => {
      let output = '';
      let error = '';
      
      const process = spawn(command, args, { stdio: 'pipe' });
      const timeout = setTimeout(() => {
        process.kill();
        reject(new SystemError('Command timeout', 'SYSTEM_COMMAND_TIMEOUT'));
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
          AdvancedLogger.info('Command executed successfully', { command, args });
          resolve(output.trim());
        } else {
          reject(new SystemError(`Command failed with code ${code}: ${error}`, 'SYSTEM_COMMAND_FAILED'));
        }
      });

      process.on('error', (err) => {
        clearTimeout(timeout);
        reject(new SystemError(`Command execution error: ${err.message}`, 'SYSTEM_COMMAND_FAILED'));
      });
    });
  }

  private static async readTemperature(): Promise<number | undefined> {
    try {
      const tempOutput = await this.spawnCommand('cat', [this.THERMAL_PATH]);
      return parseInt(tempOutput) / 1000;
    } catch {
      return undefined;
    }
  }

  private static async getDiskSpace() {
    const output = await this.spawnCommand('df', ['/', '--output=size,used,avail']);
    const lines = output.trim().split('\n');
    const [total, used, free] = lines[1].trim().split(/\s+/).map(x => parseInt(x) * 1024);
    return { total, used, free };
  }

  private static async getCPUUsage(): Promise<number> {
    const output = await this.spawnCommand('top', ['-bn1']);
    const cpuLine = output.split('\n').find(line => line.includes('Cpu(s)'));
    if (!cpuLine) {
      throw new SystemError('Failed to parse CPU usage', 'SYSTEM_PARSE_ERROR');
    }
    return parseFloat(cpuLine.split(',')[0].split(':')[1]);
  }

  private static async checkCommand(command: string): Promise<boolean> {
    try {
      await this.spawnCommand('which', [command]);
      return true;
    } catch {
      return false;
    }
  }

  private static async checkDiskSpace(): Promise<HealthCheck> {
    const { total, used } = await this.getDiskSpace();
    const percentageUsed = (used / total) * 100;
    
    return {
      component: 'disk',
      healthy: percentageUsed < this.HEALTH_THRESHOLDS.DISK_USAGE,
      details: { percentageUsed }
    };
  }

  private static checkMemory(): HealthCheck {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const percentageUsed = ((totalMemory - freeMemory) / totalMemory) * 100;
    
    return {
      component: 'memory',
      healthy: percentageUsed < this.HEALTH_THRESHOLDS.MEMORY_USAGE,
      details: { percentageUsed }
    };
  }

  private static async checkCPU(): Promise<HealthCheck> {
    const cpuUsage = await this.getCPUUsage();
    
    return {
      component: 'cpu',
      healthy: cpuUsage < this.HEALTH_THRESHOLDS.CPU_USAGE,
      details: { cpuUsage }
    };
  }

  private static resetSystemState(): void {
    this.systemState = {
      isShuttingDown: false,
      isRestarting: false,
      isSleeping: false
    };
  }

  private static validateStateTransition(action: keyof SystemState): void {
    if (Object.values(this.systemState).some(state => state)) {
      throw new SystemError('Invalid system state transition', 'SYSTEM_STATE_TRANSITION_INVALID');
    }
    this.systemState[action] = true;
  }

  private static wrapError(error: any): SystemError {
    if (error instanceof SystemError) {
      return error;
    }
    return new SystemError(error.message || 'Unknown error occurred', 'SYSTEM_UNKNOWN_ERROR');
  }
}