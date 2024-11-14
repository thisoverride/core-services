import { Request, Response } from 'express'; 
import { Controller, HttpResponse } from './ControllerInterface';
import mediaService from '../service/MediaService';
import HttpStatusCodes from '../utils/HttpStatusCode';

export default class RemoteCtrlController implements Controller {
  public readonly ROUTE: Array<string>;
  private readonly _mediaService: mediaService;

  public constructor(remoteCtrlService: mediaService) {
    this._mediaService = remoteCtrlService;
    this.ROUTE = [
      '@GET(/photo/find-photo/:sessionID, findUserPhoto)',
      '@POST(/memory/release, releaseMemory)',
    ];
  }

  public async findUserPhoto(request: Request, response: Response): Promise<void> {
    try {
      const { sessionID } = request.params;
      const result: HttpResponse = this._mediaService.getPhoto(sessionID);
      response.status(result.status).json({ message: result.message });
    } catch (error: any) {
      response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
    }
  }

  public async releaseMemory(request: Request, response: Response): Promise<void> {
    try {
      const result: HttpResponse = this._mediaService.deleteAllPhotos();
      response.status(result.status).json({ message: result.message });
    } catch (error: any) {
      response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
    }
  }
}
