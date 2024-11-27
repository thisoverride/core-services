/**
 * @fileoverview Types and interfaces for the Security Control Library
 * @module SecurityControl
 */

/**
 * Configuration options for the security system
 * @interface SecurityConfig
 */
export interface SecurityConfig {
  /** Maximum number of login attempts before lockout */
  maxLoginAttempts: number;
  /** Lockout timeout in milliseconds */
  lockTimeout: number;
  /** Whether to wipe device after max failed attempts */
  wipeOnFailedAttempts: boolean;
  /** Enable GPS tracking for device location */
  gpsTracking: boolean;
  /** Enable remote wipe capability */
  remoteWipeEnabled: boolean;
  /** Enable disk encryption */
  encryptionEnabled: boolean;
  /** Endpoint for secure storage of backups */
  secureStorageEndpoint?: string;
  /** Admin email for notifications */
  adminEmail?: string;
  /** Paths to backup during remote wipe */
  backupPaths?: string[];
}

/**
 * Location data from device GPS
 * @interface LocationData
 */
export interface LocationData {
  /** Latitude coordinate */
  latitude: number;
  /** Longitude coordinate */
  longitude: number;
  /** Timestamp of location reading */
  timestamp: number;
  /** Accuracy radius in meters */
  accuracy: number;
}

/**
 * Result of encryption operation
 * @interface EncryptionResult
 */
export interface EncryptionResult {
  /** Encrypted data */
  encrypted: Uint8Array;
  /** Nonce used for encryption */
  nonce: Uint8Array;
  /** Encryption key */
  key: Uint8Array;
}

/**
 * System health check result
 * @interface HealthCheck
 */
export interface HealthCheck {
  /** Overall system health status */
  status: 'healthy' | 'warning' | 'critical';
  /** Health check message */
  message: string;
  /** Timestamp of check */
  timestamp: number;
  /** Individual check results */
  checks: {
    /** Physical tampering check */
    tamper: boolean;
    /** Encryption system check */
    encryption: boolean;
    /** Secure storage connection check */
    secureStorage: boolean;
    /** System file integrity check */
    systemIntegrity: boolean;
  };
}

/**
 * Secure token validation result
 * @interface TokenValidation
 */
export interface TokenValidation {
  /** Is token valid */
  valid: boolean;
  /** Token expiration timestamp */
  expires: number;
  /** Token permissions */
  permissions: string[];
}

/**
 * Backup operation result
 * @interface BackupResult
 */
export interface BackupResult {
  /** Backup success status */
  success: boolean;
  /** Backup timestamp */
  timestamp: number;
  /** Encrypted backup data */
  data: EncryptionResult;
  /** Backed up file paths */
  paths: string[];
}

/**
 * Device state information
 * @interface DeviceState
 */
export interface DeviceState {
  /** Is device locked */
  isLocked: boolean;
  /** Is device encrypted */
  isEncrypted: boolean;
  /** Active security measures */
  activeMeasures: string[];
  /** Last security event */
  lastEvent?: {
    type: string;
    timestamp: number;
    message: string;
  };
}

/**
 * System error codes
 * @enum
 */
export enum SecurityErrorCode {
  INITIALIZATION_FAILED = 'INIT_FAILED',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  AUTHENTICATION_FAILED = 'AUTH_FAILED',
  TAMPERING_DETECTED = 'TAMPER_DETECTED',
  BACKUP_FAILED = 'BACKUP_FAILED',
  WIPE_FAILED = 'WIPE_FAILED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  SYSTEM_LOCKED = 'SYSTEM_LOCKED'
}

/**
 * Custom error class for security operations
 * @class SecurityError
 * @extends Error
 */
export class SecurityError extends Error {
  constructor(
    message: string,
    public code: SecurityErrorCode,
    public details?: any
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}

/**
 * Main security control class
 * @class SecurityControl
 */
export class IOsVault {
  /**
   * Initialize security system
   * @throws {SecurityError}
   */
  public static async initialize(): Promise<void>;

  /**
   * Encrypt data using libsodium
   * @param data - Data to encrypt
   * @returns Encrypted data result
   * @throws {SecurityError}
   */
  public static async encryptData(data: Uint8Array): Promise<EncryptionResult>;

  /**
   * Lock device and encrypt storage
   * @param reason - Reason for locking
   * @throws {SecurityError}
   */
  public static async lockDevice(reason: string): Promise<void>;

  /**
   * Remotely wipe device
   * @param securityToken - Admin security token
   * @throws {SecurityError} 
   */
  public static async remoteWipe(securityToken: string): Promise<void>;

  /**
   * Get current device state
   * @returns Current security state
   */
  public static async getDeviceState(): Promise<DeviceState>;
}