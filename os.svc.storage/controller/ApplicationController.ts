import { Request, Response } from 'express'; 
import { ControllerImpl,HttpResponse } from './ControllerInterface';
import ApplicationService from '../services/ApplicationService';

export default class ApplicationController implements ControllerImpl {
  public readonly ROUTE: Array<string>;
  private applicationService: ApplicationService;

  public constructor(applicationService: ApplicationService) {
    this.ROUTE = ['@POST(/test,pushFinalPhoto)'];
    this.applicationService = applicationService;
  }

  public pushFinalPhoto(request: Request, response: Response) : void {
    try {
      const { id , blob } = request.body; 
      this.applicationService.updateStorage(id , blob )
    } catch(error: any) {
      response.status(error.status || 500).json({ message: error.message });
    }
  } 
}
