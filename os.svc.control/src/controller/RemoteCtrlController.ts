import { Request, Response } from 'express'; 
import { Controller, HttpResponse } from './ControllerInterface';
import RemoteCtrlService from '../service/RemoteCtrlService';
import HttpStatusCodes from '../utils/HttpStatusCode';

export default class RemoteCtrlController implements Controller {
  public readonly ROUTE: Array<string>;
  private readonly _remoteCtrlService: RemoteCtrlService;

  public constructor(remoteCtrlService: RemoteCtrlService) {
    this._remoteCtrlService = remoteCtrlService;
    this.ROUTE = [
      '@GET(/svc/status, getStatus)',
      '@POST(/svc/stop-services, stopServices)',
      '@POST(/svc/restart-services, restartServices)',
      '@GET(/svc/services, getServices)',
      '@POST(/lock, lockMachine)',
      '@POST(/restart, restartMachine)',
      '@GET(/logs, getLogs)',
      '@POST(/shutdown, shutdownMachine)',
    ];
  }

  public async lockMachine(request: Request, response: Response): Promise<void> {
    try {
      const result: HttpResponse = await this._remoteCtrlService.lockBorne();
      response.status(result.status).json({ message: result.message });
    } catch (error: any) {
      response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
    }
  }

  public async restartMachine(request: Request, response: Response): Promise<void> {
    try {
      const result: HttpResponse = await this._remoteCtrlService.restart();
      response.status(result.status).json({ message: result.message });
    } catch (error: any) {
      response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
    }
  }

  public async getLogs(request: Request, response: Response): Promise<void> {
    try {
      const result: HttpResponse = await this._remoteCtrlService.getLogs();
      response.status(result.status).json({ logs: result.message });
    } catch (error: any) {
      response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
    }
  }

  public async getStatus(request: Request, response: Response): Promise<void> {
    try {
      const result: HttpResponse = await this._remoteCtrlService.getStatus();
      response.status(result.status).json({ status: result.message });
    } catch (error: any) {
      response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
    }
  }

  public async stopServices(request: Request, response: Response): Promise<void> {
    try {
      const { process } = request.body; 
      const result: HttpResponse = await this._remoteCtrlService.stopServices(process);
      response.status(result.status).json({ message: result.message });
    } catch (error: any) {
      response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
    }
  }

  public async restartServices(request: Request, response: Response): Promise<void> {
    try {
      const { process } = request.body; 
      const result: HttpResponse = await this._remoteCtrlService.restartServices(process);
      response.status(result.status).json({ message: result.message });
    } catch (error: any) {
      response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
    }
  }

  public async shutdownMachine(request: Request, response: Response): Promise<void> {
    try {
      const result: HttpResponse = await this._remoteCtrlService.shutdown();
      response.status(result.status).json({ message: result.message });
    } catch (error: any) {
      response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
    }
  }

  public async getServices(request: Request, response: Response): Promise<void> {
    try {
      const result: HttpResponse = await this._remoteCtrlService.listServices();
      response.status(result.status).json({ services: result.message });
    } catch (error: any) {
      response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
    }
  }
}
