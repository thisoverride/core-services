import { HealthCheckResult, SystemStatus } from '../../@type/global';
export declare class SystemXControl {
    private static readonly COMMAND_TIMEOUT;
    private static readonly HEALTH_THRESHOLDS;
    private static readonly THERMAL_PATH;
    private static readonly commandMutex;
    private static systemState;
    private static readonly ALLOWED_COMMANDS;
    constructor();
    static getStatus(): Promise<SystemStatus>;
    static sleep(): Promise<void>;
    static restart(): Promise<void>;
    static shutdown(): Promise<void>;
    static cancelShutdown(): Promise<void>;
    static healthCheck(): Promise<HealthCheckResult>;
    private static validateCommandAndArgs;
    private static spawnCommand;
    private static readTemperature;
    private static getDiskSpace;
    private static getCPUUsage;
    private static checkCommand;
    private static checkDiskSpace;
    private static checkMemory;
    private static checkCPU;
    private static resetSystemState;
    private static validateStateTransition;
    private static wrapError;
}
//# sourceMappingURL=SystemXControl.d.ts.map