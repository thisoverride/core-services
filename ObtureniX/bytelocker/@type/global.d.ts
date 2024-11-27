export interface SystemStatus {
  uptime: number;
  loadAverage: number[];
  totalMemory: number;
  freeMemory: number;
  cpuUsage: number;
  temperature?: number;
  diskSpace: {
    total: number;
    used: number;
    free: number;
  };
}

export interface SystemState {
  isShuttingDown: boolean;
  isRestarting: boolean;
  isSleeping: boolean;
}

export interface HealthCheck {
  component: 'disk' | 'memory' | 'cpu';
  healthy: boolean;
  details: {
    percentageUsed?: number;
    cpuUsage?: number;
    [key: string]: any;
  };
}

export interface HealthCheckResult {
  healthy: boolean;
  message: string;
  checks: HealthCheck[];
}