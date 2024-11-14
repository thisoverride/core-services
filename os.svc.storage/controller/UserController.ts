import { Request, Response } from 'express'; 
import { ControllerImpl,HttpResponse } from './ControllerInterface';
import UserService from '../services/UserService';

export default class UserController implements ControllerImpl {
  public readonly ROUTE: Array<string>;
  private userService: UserService;

  public constructor(userService: UserService) {
    this.ROUTE = ['@GET(/smile-storage/store/:id,storage)'];
    this.userService = userService;
  }

  public storage(request: Request, response: Response): void {
    try {
      const { id } = request.params;
      const serviceResponse : string[] =  this.userService.renderStorage(id);     
      console.log(serviceResponse.length)
      if(serviceResponse.length > 0){
        response.render('index', { 
        title: 'Smile Storage' , 
        userPhotos : serviceResponse ,
        count: serviceResponse.length
      });
      }else {
        response.redirect(`/${id}`);
      }

    } catch (error: any) {
      response.status(error.status || 500).json({ message: error.message });
    }
  }
}
