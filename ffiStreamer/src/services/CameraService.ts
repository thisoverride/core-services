import { Camera, CameraBrowser, CameraProperty, cameraBrowser, watchCameras, Option, ImageQuality, CameraFile } from '@dimensional/napi-canon-cameras';
import type { DefaultEventsMap } from 'socket.io/dist/typed-events';
import type { Socket } from 'socket.io';
import LoggerMixin from '../infrastructure/logger/LoggerMixin';
import { LiveViewImage } from '@dimensional/napi-canon-cameras/stubs/camera-api/LiveViewImage';
import fs from 'node:fs'
import { EventEmitter } from 'events';


export default class CameraService extends LoggerMixin {
  private _camera: Camera;
  private isStopped: boolean = false;
  private static SESSION_FILE_PATH: string = "";
  public eventEmitter: EventEmitter;
  public cameraWarning: string | null = null;
  public counter: number = 0;
  private readonly MAX_FRAME: number = 60;
  private videoFrames: string[] | null = null;
  public isReady: boolean = false;

  private socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> | null = null;

  constructor() {
    super()
    this._camera = this._buildCameraInstance();
    this.eventEmitter = new EventEmitter();
    this.socket = null;
  }

  private _buildCameraInstance(): Camera {
    let camera: null | Camera = null;
    try {
      camera = new Camera();

      cameraBrowser.setEventHandler(
        async (eventName, event) => {
          switch (eventName) {
            case CameraBrowser.EventName.DownloadRequest:
              this.onDownloadRequest(event);
              break;
            case Camera.EventName.CameraDisconnect:
              this.onCameraDisconnect();
              break;
            case Camera.EventName.LiveViewStart:
              this.onLiveViewStart();
              break;
            case Camera.EventName.FocusInfo:
              break;
            default:
              break;
          }
        }
      );

    } catch (error: any) {

      this.logError(error);
    }

    watchCameras()
    return camera as Camera
  }

  private onDownloadRequest(event: any): void {
    const CameraFile = (event as any).file as CameraFile;
    CameraFile.downloadToPath(CameraService.SESSION_FILE_PATH)
    this.eventEmitter.emit('processingComplete');

    const thumbnail: string = `${CameraService.SESSION_FILE_PATH}/thumbnail`;
    if (!fs.existsSync(thumbnail)) {
      fs.mkdirSync(thumbnail);
    }
    this.logInfo(`Downloaded ${CameraFile.name}.`);
  }

  private onCameraDisconnect(): void {
    this.logError("Afficher un message d'erreur")
  }

  private onLiveViewStart(): void {
    if (this.socket) {
      this.processLiveView(this.socket);
    } else {
      this.cameraWarning = "<t>Camera was not properly truned off</t>"
      this._camera.stopLiveView()
    }
  }

  public connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        this._camera.connect();
        const property = this._camera.getProperty(CameraProperty.ID.BatteryLevel);
        this._camera.setProperties({
          [CameraProperty.ID.SaveTo]: Option.SaveTo.Host,
          [CameraProperty.ID.ImageQuality]: ImageQuality.ID.LargeJPEGFine,
        });
        this.logInfo(`Camera ${this._camera.description} connected`);
        this.logInfo(`Camera BatteryLevel ${property.value} %`);
        resolve(true);
      } catch (error: any) {
        this.logError(error.message);
        reject(false);
      }
    });
  }


  public disconnect(): void {
    this._camera.disconnect()
  }

  public async takePhoto(): Promise<string> {

    try {
      this.isStopped = true;
      this.stopStream();
      this._camera.takePicture()
      await new Promise<void>((resolve) => {
        this.eventEmitter.once('processingComplete', () => {
          this.logInfo('Opération terminée');
          resolve();
        });
      });

      return "OK";
    } catch (error: any) {
      this.logError(`${error}`);

      if (error.message === "EDSDK - TAKE_PICTURE_AF_NG") {
        return "AF_ERROR";
      } else if (error.message === "EDSDK - DEVICE_BUSY") {
        return "DEVICE_BUSY";
      } else {
        this.logError(`${error}`);
        throw new Error("Erreur lors de la prise de photo");
      }
    }
  }



  public async streamLiveView(socket: Socket): Promise<void> {
    this.socket = socket;
    this.isStopped = false;
    this._camera.startLiveView();
  }


  private async processLiveView(socket: any): Promise<void> {
    while (this._camera.isLiveViewActive() && !this.isStopped) {
      try {
        const streamImg: LiveViewImage = this._camera.getLiveViewImage();
        const base64Data: string = streamImg.getDataURL();
        if (this.isReady) {
          if (this.counter <= this.MAX_FRAME) {
            if (this.videoFrames === null) {

              this.videoFrames = [];
            }
          }

          if (this.counter <= this.MAX_FRAME) {
            if (this.videoFrames === null) {
              this.videoFrames = [];
            }
            this.videoFrames.push(base64Data);
            this.counter++;
          } else {
            this.stopStream();
            this.isReady = false;
            this.counter = 0;

            if (this.videoFrames) {
              this.videoFrames = null;
            }
          }
        }
        socket.emit('stream', { data: base64Data });
        await this.sleep(0)
      } catch (error: any) {
        if (error.message === "EDSDK - OBJECT_NOTREADY")
          socket.emit('stream', { data: 'OBJECT_NOTREADY' })
      }

    }
  }

  public focus(): void {
    this._camera.sendCommand(Camera.Command.PressShutterButton, Camera.PressShutterButton.Halfway);
  }

  public stopStream(): void {
    this._camera.sendCommand(Camera.Command.PressShutterButton, Camera.PressShutterButton.OFF);
    this.isStopped = true;
    this._camera.stopLiveView();
  }


  public async sleep(time: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(() => resolve(), time));
  }

}    
