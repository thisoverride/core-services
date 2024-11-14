import express, { Application ,Request, Response,NextFunction } from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import path from 'path';
import PathValidator from '../validator/PathValidator';
import UserController from '../../controller/UserController';
import UserService from '../../services/UserService';
import ApplicationService from '../../services/ApplicationService';
import ApplicationController from '../../controller/ApplicationController'


export default class ExpressApp {
  public app: Application;
  public controller: Array<any>;
  public PathValidator: PathValidator;

  /**
   * Creates an instance of ExpressApp.
   * Initializes middleware and sets up error handling.
   * @memberof ExpressApp
   */
  public constructor() {
    this.app = express();
    this._initExpressApp()
    this.PathValidator = new PathValidator();
    this.controller = [
      new UserController(new UserService()),
      new ApplicationController(new ApplicationService())
    ];
    this.injectControllers();
    this.setupErrorHandling();
  }

  /**
   *
   * Injects controller routes into the Express.
   * @private
   * @memberof ExpressApp
   */
   private injectControllers(): void {
    this.controller.forEach((controllerObject) => {
      controllerObject.ROUTE.forEach((controllerProperties: string) => {
        const [method, path, controller] = this.PathValidator.checkPath(controllerProperties);
        if (!(controller in controllerObject) || typeof controllerObject[controller] !== 'function') {
          throw new Error(`The function ${controller} is not a valid controller in the provided object.`);
        }        
        (this.app as unknown as { [key: string]: Function })[method](path, (req: Request, res: Response) =>
          controllerObject[controller](req, res));
      });
    });
  }

  private _initExpressApp (): void {
    // this.app.use(helmet());
    this.app.use(express.json());
    this.app.use(morgan('dev'));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(express.static(path.join(__dirname, '..', '..', '..', 'public')));
    console.log(path.join(__dirname, '..', '..', '..', 'public'))
    this.app.set('views', path.join(__dirname, '..', '..', 'views'));
    this.app.set('view engine', 'ejs');
  };
  /**
   *
   * Sets up error handling middleware.
   * @private
   * @memberof ExpressApp
   */
   private setupErrorHandling(): void {
    this.app.use((req: Request, res: Response) => {
      res.status(404).render('nofound',{title: 'Smile Storage n\'a pas trouvé cette page'})
    });
    
    this.app.use((err: Error, request: Request, response: Response ,next: NextFunction) => {
      if (err instanceof SyntaxError) {
        response.status(400).json({message: 'Bad request: the format body is incorrect.'});
      } else {
        next(err);
      }
    });
  }

  /**
   *
   * Starts the Express application on the specified port.
   * @param {number} port
   * @memberof ExpressApp
   */
  public async run() {
      this.app.listen(8001, () => {
      console.info(`Service running on http://localhost:8001`);
    });
  }
}
