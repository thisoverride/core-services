import { exec, spawn } from 'child_process';
import { HttpStatusCodes, DirManager } from '../utils/Utils';
import { HttpResponse } from '../controller/ControllerInterface';
import pm2 from 'pm2';

export default class RemoteCtrlService {

  public constructor() {}

  public async lockBorne(): Promise<HttpResponse> {
    try {
      await this.executeCommand('rundll32.exe user32.dll, LockWorkStation');
      return { message: 'Borne verrouillée avec succès', status: HttpStatusCodes.OK };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  public async restart(): Promise<HttpResponse> {
    try {
      const command = 'shutdown /r /t 0'; 
      await this.executeCommand(command);
      this.logAction('Restart', { success: true });
      return { message: 'Borne redémarrée avec succès', status: HttpStatusCodes.OK };
    } catch (error: any) {
      this.logAction('Restart', { success: false, error: error.message });
      return this.handleError(error);
    }
  }

  public async getStatus(): Promise<HttpResponse> {
    try {
      return await new Promise<HttpResponse>((resolve, reject) => {
        pm2.list((err, processDescriptionList) => {
          if (err) {
            return reject(this.handleError(err));
          }
  
          const statuses = processDescriptionList.map(proc => ({
            pid: proc.pid,
            name: proc.name,
            status: proc.pm2_env?.status ?? 'unknown',  
            uptime: proc.pm2_env?.pm_uptime ?? 'unknown',  
          }));
  
          resolve({
            message: statuses,
            status: HttpStatusCodes.OK,
          });
        });
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
  

  public async listServices(): Promise<HttpResponse> {
    return new Promise<HttpResponse>((resolve, reject) => {
      pm2.list((err, processDescriptionList) => {
        if (err) {
          return reject(this.handleError(err));
        }
        resolve({
          message: processDescriptionList.map(proc => proc.name),
          status: HttpStatusCodes.OK,
        });
      });
    }).catch(error => {
      return this.handleError(error);
    });
  }

  public async getLogs(): Promise<HttpResponse> {
    try {
      return await new Promise<HttpResponse>((resolve, reject) => {
        pm2.list((err, processDescriptionList) => {
          if (err) {
            return reject(this.handleError(err));
          }
  
          const logs = processDescriptionList.map(proc => ({
            name: proc.name,
            logs: proc.pm2_env 
              ? (proc.pm2_env.pm_out_log_path || proc.pm2_env.pm_err_log_path) 
              : 'No logs available' 
          }));
          console.log(logs)
  
          resolve({
            message: logs,
            status: HttpStatusCodes.OK,
          });
        });
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
  

  public async stopServices(process: string): Promise<HttpResponse> {
    if (!this.validateServiceName(process)) {
      return { message: 'Invalid service name', status: HttpStatusCodes.BAD_REQUEST };
    }

    return new Promise<HttpResponse>((resolve, reject) => {
      pm2.stop(process, (err, proc) => {
        if (err) {
          return reject(this.handleError(err));
        }

        resolve({
          message: `Service ${process} stopped`,
          status: HttpStatusCodes.OK,
        });
      });
    }).catch(error => {
      return this.handleError(error);
    });
  }

  public async restartServices(process: string): Promise<HttpResponse> {
    if (!this.validateServiceName(process)) {
      return { message: 'Invalid service name', status: HttpStatusCodes.BAD_REQUEST };
    }

    return new Promise<HttpResponse>((resolve, reject) => {
      pm2.restart(process, (err, proc) => {
        if (err) {
          return reject(this.handleError(err));
        }

        resolve({
          message: `Service ${process} restarted`,
          status: HttpStatusCodes.OK,
        });
      });
    }).catch(error => {
      return this.handleError(error);
    });
  }

  public async shutdown(): Promise<HttpResponse> {
    try {
      await this.executeCommand('shutdown /s /t 0');  
      return { message: 'Borne éteinte avec succès', status: HttpStatusCodes.OK };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  private executeCommand(command: string, args: string[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      const cmd = spawn(command, args, { shell: true });
      cmd.stdout.on('data', data => console.log(`stdout: ${data}`));
      cmd.stderr.on('data', data => console.error(`stderr: ${data}`));
      cmd.on('close', code => {
        if (code !== 0) {
          reject(new Error(`Command failed with code ${code}`));
        } else {
          resolve();
        }
      });
    });
  }

  private validateServiceName(serviceName: string): boolean {
    const validServiceNames = ['service1', 'service2']; 
    return validServiceNames.includes(serviceName);
  }

  private handleError(error: any): HttpResponse {
    if (error.code === 'EACCES') {
      return { message: 'Permission denied', status: HttpStatusCodes.FORBIDDEN };
    } else if (error.code === 'ENOENT') {
      return { message: 'Command not found', status: HttpStatusCodes.NOT_FOUND };
    } else {
      return { message: error.message, status: HttpStatusCodes.INTERNAL_SERVER_ERROR };
    }
  }

  private logAction(action: string, details: any): void {
    console.log(`[${new Date().toISOString()}] ${action}: ${JSON.stringify(details)}`);
  }
}
