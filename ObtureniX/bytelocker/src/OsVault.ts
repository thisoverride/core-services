import { randombytes_buf, crypto_secretbox_KEYBYTES, crypto_secretbox_NONCEBYTES, crypto_secretbox_easy, crypto_secretbox_open_easy } from 'libsodium-wrappers';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { EncryptionResult, HealthCheck, IOsVault, LocationData, SecurityConfig } from './@types/global';


export default class OsVault implements IOsVault {
  private static execAsync = promisify(exec);
  private static readonly CONFIG_PATH = '/etc/security/device-security.conf';
  private static readonly MASTER_KEY_PATH = '/etc/security/master.key';
  private static readonly KNOWN_DEVICES_PATH = '/etc/security/known_devices';
  private static readonly HASH_STORE_PATH = '/etc/security/hash_store';
  private static readonly COMMAND_TIMEOUT = 5000;
  
  private static config: SecurityConfig = {
    maxLoginAttempts: 5,
    lockTimeout: 300000,
    wipeOnFailedAttempts: true,
    gpsTracking: true,
    remoteWipeEnabled: true,
    encryptionEnabled: true,
    backupPaths: ['/etc/passwd', '/etc/shadow', '/home']
  };

  private static loginAttempts = 0;
  private static isInitialized = false;
  private static knownDevices: Set<string> = new Set();
  private static lastHealthCheck: HealthCheck | null = null;

  public static async initialize(): Promise<void> {
    try {
      await require('libsodium-wrappers').ready;
      this.isInitialized = true;
      
      await this.loadConfig();
      await this.setupEncryption();
      await this.enableSecureBoot();
      await this.loadKnownDevices();
      
      this.startMonitoring();
    } catch (error) {
      throw this.handleError(error, 'Security initialization failed');
    }
  }

  public static async encryptData(data: Uint8Array): Promise<EncryptionResult> {
    if (!this.isInitialized) await this.initialize();
    
    const key = randombytes_buf(crypto_secretbox_KEYBYTES);
    const nonce = randombytes_buf(crypto_secretbox_NONCEBYTES);
    const encrypted = crypto_secretbox_easy(data, nonce, key);
    
    return {
      encrypted,
      nonce,
      key
    };
  }
  
  public static async decryptData(encrypted: Uint8Array, key: Uint8Array, nonce: Uint8Array): Promise<Uint8Array> {
    if (!this.isInitialized) await this.initialize();
    
    const decrypted = crypto_secretbox_open_easy(encrypted, nonce, key);
    if (!decrypted) {
      throw new Error('Decryption failed');
    }
    return decrypted;
  }

  public static async encryptFile(
    filePath: string, 
    outputPath: string
  ): Promise<EncryptionResult> {
    const data = await fs.promises.readFile(filePath);
    const result = await this.encryptData(data);
    await fs.promises.writeFile(outputPath, result.encrypted);
    return result;
  }

  public static async lockDevice(reason: string): Promise<void> {
    try {
      if (!this.isInitialized) await this.initialize();

      const key = randombytes_buf(crypto_secretbox_KEYBYTES);
      await this.encryptVolume('/dev/sda1', key);
      await this.execAsync('loginctl lock-sessions');
      await this.disableExternalPorts();
      await this.notifyAdmin(`Device locked: ${reason}`);

      this.loginAttempts = 0;
    } catch (error) {
      throw this.handleError(error, 'Failed to lock device');
    }
  }

  public static async remoteWipe(securityToken: string): Promise<void> {
    try {
      if (!await this.validateSecurityToken(securityToken)) {
        throw new Error('Invalid security token');
      }

      if (this.config.backupPaths) {
        const criticalData = await this.gatherCriticalData();
        const encryptedBackup = await this.encryptData(criticalData);
        await this.sendToSecureStorage(encryptedBackup);
      }

      await this.secureErase();
    } catch (error) {
      throw this.handleError(error, 'Remote wipe failed');
    }
  }

  private static async setupEncryption(): Promise<void> {
    try {
      if (!await this.fileExists(this.MASTER_KEY_PATH)) {
        const masterKey = randombytes_buf(crypto_secretbox_KEYBYTES);
        await fs.promises.writeFile(this.MASTER_KEY_PATH, masterKey);
        await this.execAsync(`chmod 600 ${this.MASTER_KEY_PATH}`);
      }

      if (await this.commandExists('tpm2_createprimary')) {
        await this.execAsync('tpm2_createprimary -c /tmp/primary.ctx');
        await this.execAsync('tpm2_create -C /tmp/primary.ctx -u key.pub -r key.priv');
      }
    } catch (error) {
      throw this.handleError(error, 'Encryption setup failed');
    }
  }

  private static async enableSecureBoot(): Promise<void> {
    try {
      if (await this.commandExists('mokutil')) {
        const { stdout } = await this.execAsync('mokutil --sb-state');
        if (!stdout.includes('SecureBoot enabled')) {
          await this.notifyAdmin('WARNING: Secure Boot is not enabled');
        }
      }
    } catch (error) {
      throw this.handleError(error, 'Secure Boot check failed');
    }
  }

  private static async startMonitoring(): Promise<void> {
    setInterval(async () => {
      try {
        const healthCheck = await this.performHealthCheck();
        
        if (healthCheck.status !== 'healthy') {
          await this.notifyAdmin(`Health check warning: ${healthCheck.message}`);
        }

        if (this.config.gpsTracking) {
          const location = await this.getLocation();
          if (location) {
            const encryptedLocation = await this.encryptData(
              Buffer.from(JSON.stringify(location))
            );
            await this.sendToSecureStorage(encryptedLocation);
          }
        }

        await this.monitorConnections();
        await this.checkSystemIntegrity();
      } catch (error: any) {
        await this.notifyAdmin(`Monitoring alert: ${error.message}`);
      }
    }, 60000);
  }

  private static async performHealthCheck(): Promise<HealthCheck> {
    const checks = {
      tamper: await this.checkTamperStatus(),
      encryption: await this.checkEncryption(),
      secureStorage: await this.checkSecureStorage(),
      systemIntegrity: await this.checkSystemIntegrity()
    };

    const allHealthy = Object.values(checks).every(check => check);
    const status = allHealthy ? 'healthy' : 'warning';

    const healthCheck: HealthCheck = {
      status,
      message: allHealthy ? 'All systems operational' : 'System warnings detected',
      timestamp: Date.now(),
      checks
    };

    this.lastHealthCheck = healthCheck;
    return healthCheck;
  }

  private static async checkTamperStatus(): Promise<boolean> {
    try {
      // Check hardware integrity
      const { stdout: lsusb } = await this.execAsync('lsusb');
      const newDevices = this.detectNewDevices(lsusb);

      if (newDevices.length > 0) {
        await this.notifyAdmin(`New devices detected: ${newDevices.join(', ')}`);
        return false;
      }

      // Check for known rootkits
      const { stdout: chkrootkit } = await this.execAsync('chkrootkit || true');
      if (chkrootkit.includes('INFECTED')) {
        await this.notifyAdmin('Rootkit detected!');
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  private static async checkEncryption(): Promise<boolean> {
    try {
      // Verify master key integrity
      const keyData = await fs.promises.readFile(this.MASTER_KEY_PATH);
      if (keyData.length !== crypto_secretbox_KEYBYTES) {
        return false;
      }

      // Test encryption
      const testData = randombytes_buf(32);
      const { encrypted, key, nonce } = await this.encryptData(testData);
      const decrypted = await this.decryptData(encrypted, key, nonce);

      return Buffer.compare(testData, decrypted) === 0;
    } catch {
      return false;
    }
  }

  private static async checkSecureStorage(): Promise<boolean> {
    try {
      if (!this.config.secureStorageEndpoint) {
        return true;
      }

      // Test secure storage connectivity
      const testData = await this.encryptData(Buffer.from('test'));
      await this.sendToSecureStorage(testData);
      return true;
    } catch {
      return false;
    }
  }

  private static async encryptVolume(devicePath: string, key: Uint8Array): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    
    const blockSize = 1024 * 1024; // 1MB blocks
    const fileHandle = await fs.promises.open(devicePath, 'r+');
    
    try {
      let position = 0;
      while (true) {
        const buffer = Buffer.alloc(blockSize);
        const { bytesRead } = await fileHandle.read(buffer, 0, blockSize, position);
        
        if (bytesRead === 0) break;
        
        const nonce = randombytes_buf(crypto_secretbox_NONCEBYTES);
        const encrypted = crypto_secretbox_easy(buffer.slice(0, bytesRead), nonce, key);
        await fileHandle.write(Buffer.concat([nonce, encrypted]), 0, encrypted.length + nonce.length, position);
        position += bytesRead;
      }
    } finally {
      await fileHandle.close();
    }
  }

  private static async secureErase(): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    
    try {
      // First encrypt all data
      const key = randombytes_buf(crypto_secretbox_KEYBYTES);
      await this.encryptVolume('/dev/sda1', key);
      
      // Multiple pass overwrite
      for (let i = 0; i < 3; i++) {
        const random = randombytes_buf(1024 * 1024);
        await this.overwriteDisk(random);
      }
      
      // Final zero pass
      await this.execAsync('dd if=/dev/zero of=/dev/sda bs=1M');
      
      // Clear TPM if available
      if (await this.commandExists('tpm2_clear')) {
        await this.execAsync('tpm2_clear');
      }
    } catch (error) {
      throw this.handleError(error, 'Secure erase failed');
    }
  }

  private static async validateSecurityToken(token: string): Promise<boolean> {
    try {
      const tokenData = Buffer.from(token, 'base64');
      const key = await this.getMasterKey();
      const nonce = tokenData.slice(0, crypto_secretbox_NONCEBYTES);
      const encryptedData = tokenData.slice(crypto_secretbox_NONCEBYTES);
      
      const decrypted = crypto_secretbox_open_easy(encryptedData, nonce, key);
      if (!decrypted) {
        throw new Error('Invalid token');
      }
      
      const tokenInfo = JSON.parse(decrypted.toString());
      const timestamp = new Date(tokenInfo.timestamp).getTime();
      
      return Date.now() - timestamp < 300000; // 5 minutes
    } catch {
      this.loginAttempts++;
      if (this.loginAttempts >= this.config.maxLoginAttempts) {
        await this.lockDevice('Max token validation attempts exceeded');
      }
      return false;
    }
  }

  private static async getMasterKey(): Promise<Uint8Array> {
    try {
      return await fs.promises.readFile(this.MASTER_KEY_PATH);
    } catch {
      throw new Error('Master key not found');
    }
  }

  private static async gatherCriticalData(): Promise<Uint8Array> {
    if (!this.config.backupPaths) {
      return Buffer.alloc(0);
    }

    const dataBuffers: Buffer[] = [];
    
    for (const p of this.config.backupPaths) {
      try {
        const stat = await fs.promises.stat(p);
        if (stat.isDirectory()) {
          const { stdout } = await this.execAsync(`tar czf - ${p}`);
          dataBuffers.push(Buffer.from(stdout));
        } else {
          const data = await fs.promises.readFile(p);
          dataBuffers.push(data);
        }
      } catch (error: any) {
        await this.notifyAdmin(`Failed to backup ${p}: ${error.message}`);
      }
    }

    return Buffer.concat(dataBuffers);
  }

  private static async sendToSecureStorage(
    encryptedData: EncryptionResult
  ): Promise<void> {
    if (!this.config.secureStorageEndpoint) {
      return;
    }

    const tempFile = path.join(
      '/tmp', 
      `backup-${Date.now()}.enc`
    );

    try {
      await fs.promises.writeFile(tempFile, Buffer.from(encryptedData.encrypted));
      
      // Here you would implement your secure upload logic
      // Example with curl:
      await this.execAsync(
        `curl -X POST ${this.config.secureStorageEndpoint} ` +
        `-H "Content-Type: application/octet-stream" ` +
        `-d @${tempFile}`
      );
    } finally {
      await fs.promises.unlink(tempFile).catch(() => {});
    }
  }

  private static async loadConfig(): Promise<void> {
    try {
      const data = await fs.promises.readFile(this.CONFIG_PATH);
      this.config = {
        ...this.config,
        ...JSON.parse(data.toString())
      };
    } catch {
      await fs.promises.writeFile(
        this.CONFIG_PATH,
        JSON.stringify(this.config, null, 2)
      );
    }
  }

  private static async loadKnownDevices(): Promise<void> {
    try {
      const data = await fs.promises.readFile(this.KNOWN_DEVICES_PATH);
      this.knownDevices = new Set(
        data.toString().split('\n').filter(Boolean)
      );
    } catch {
      this.knownDevices = new Set();
    }
  }
  

  private static async saveKnownDevices(): Promise<void> {
    await fs.promises.writeFile(
      this.KNOWN_DEVICES_PATH,
      Array.from(this.knownDevices).join('\n')
    );
  }

  private static detectNewDevices(lsusb: string): string[] {
    const currentDevices = new Set(
      lsusb.split('\n')
        .map(line => line.trim())
        .filter(Boolean)
    );

    const newDevices = Array.from(currentDevices)
      .filter(device => !this.knownDevices.has(device));

    if (newDevices.length > 0) {
      newDevices.forEach(device => this.knownDevices.add(device));
      this.saveKnownDevices().catch(() => {});
    }

    return newDevices;
  }

  private static async checkSystemIntegrity(): Promise<boolean> {
    try {
      const criticalPaths = [
        '/boot/vmlinuz',
        this.MASTER_KEY_PATH,
        this.CONFIG_PATH
      ];

      for (const filePath of criticalPaths) {
        const currentHash = await this.calculateFileHash(filePath);
        const storedHash = await this.getStoredHash(filePath);

        if (currentHash !== storedHash) {
          await this.notifyAdmin(
            `System integrity violation detected for ${filePath}`
          );
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  private static async calculateFileHash(filePath: string): Promise<string> {
    const data = await fs.promises.readFile(filePath);
    const key = await this.getMasterKey();
    const nonce = randombytes_buf(crypto_secretbox_NONCEBYTES);
    const hashed = crypto_secretbox_easy(data, nonce, key);
    return Buffer.from(hashed).toString('hex');
  }
  
  private static async getStoredHash(filePath: string): Promise<string> {
    const hashPath = path.join(
      this.HASH_STORE_PATH,
      Buffer.from(filePath).toString('base64')
    );

    try {
      if (!await this.fileExists(hashPath)) {
        const hash = await this.calculateFileHash(filePath);
        await fs.promises.mkdir(this.HASH_STORE_PATH, { recursive: true });
        await fs.promises.writeFile(hashPath, hash);
        return hash;
      }

      return (await fs.promises.readFile(hashPath)).toString();
    } catch {
      throw new Error(`Failed to get hash for ${filePath}`);
    }
  }

  private static async monitorConnections(): Promise<void> {
    try {
      const { stdout: netstat } = await this.execAsync('netstat -tunap');
      const suspiciousConnections = netstat
        .split('\n')
        .filter(line => {
          return line.includes('ESTABLISHED') &&
            (line.includes(':4444') ||
             line.includes(':1337') ||
             line.includes('unknown'));
        });

      if (suspiciousConnections.length > 0) {
        await this.notifyAdmin(
          'Suspicious connections detected:\n' +
          suspiciousConnections.join('\n')
        );
      }
    } catch (error) {
      throw this.handleError(error, 'Connection monitoring failed');
    }
  }

  private static async getLocation(): Promise<LocationData | null> {
    try {
      // Cette implémentation devrait être adaptée selon le matériel
      // Exemple avec le GPS du système
      const { stdout } = await this.execAsync('gpspipe -w -n 5');
      const data = JSON.parse(stdout.split('\n')[0]);
      
      return {
        latitude: data.lat,
        longitude: data.lon,
        timestamp: Date.now(),
        accuracy: data.acc || 0
      };
    } catch {
      return null;
    }
  }

  private static async commandExists(command: string): Promise<boolean> {
    try {
      await this.execAsync(`which ${command}`);
      return true;
    } catch {
      return false;
    }
  }

  private static async fileExists(path: string): Promise<boolean> {
    try {
      await fs.promises.access(path);
      return true;
    } catch {
      return false;
    }
  }

  private static async overwriteDisk(data: Uint8Array): Promise<void> {
    const blockSize = 1024 * 1024;
    const fd = await fs.promises.open('/dev/sda', 'r+');
    
    try {
      let position = 0;
      while (true) {
        const { bytesWritten } = await fd.write(
          data,
          0,
          Math.min(data.length, blockSize),
          position
        );
        
        if (bytesWritten === 0) break;
        position += bytesWritten;
      }
    } finally {
      await fd.close();
    }
  }

  private static async disableExternalPorts(): Promise<void> {
    await this.execAsync('echo 0 > /sys/bus/usb/devices/*/authorized');
  }

  private static async notifyAdmin(message: string): Promise<void> {
    if (this.config.adminEmail) {
      // Implémenter la logique d'envoi d'email
      console.log(`Admin notification: ${message}`);
    }
  }

  private static handleError(error: any, message: string): Error {
    const errorMessage = `${message}: ${error.message}`;
    this.notifyAdmin(errorMessage).catch(console.error);
    return new Error(errorMessage);
  }
}