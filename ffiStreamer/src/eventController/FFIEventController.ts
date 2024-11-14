import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import LoggerMixin from '../infrastructure/logger/LoggerMixin';
import CameraService from '../services/CameraService';
import { Server, Socket } from 'socket.io';
import { logInfo } from '../decorator/ffitrace';

interface FFIEvent {
  chanel: string;
  data?: any;
}
export default class FFIEventController extends LoggerMixin {
  private readonly _cameraService: CameraService;
  private socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> | null = null;
  private readonly _io: Server;
  private isMaxConnexion: boolean = false;

  constructor(readonly cameraService: CameraService, io: Server) {
    super();
    this._io = io;
    this._io.on('connection', this._onConnection.bind(this));
    this._cameraService = cameraService;
  }

  private _onConnection(socket: Socket): void {
    this.socket = socket;
    if (this.isMaxConnexion) {
      this.logWarn('Connection rejected: Maximum client limit reached');
      this.socket.disconnect(true);
      return;
    }

    this.logInfo('Client connected');
    this.isMaxConnexion = true;

    this.socket.on('disconnect', async () => {
      this.logInfo('Client disconnected');
      this.isMaxConnexion = false;
      this.cameraService.stopStream()
    });


    this.socket.on('stream', this.onStream.bind(this));
    this.socket.on('close-stream', this.onCloseStream.bind(this));
    this.socket.on('shooting', this.onShooting.bind(this));
    this.socket.on('capture', this.onCapture.bind(this));

  }


  @logInfo
  private onStream(event: any): void {
    void (async () => await this._cameraService.streamLiveView(this.socket as any))();
  }

  @logInfo
  private onCloseStream(event: FFIEvent): void {
    this._cameraService.stopStream();
  }

  @logInfo
  private onShooting(event: any): void {
    void (async () => {
      const response = await this._cameraService.takePhoto();
      this.socket!.emit('shooting', { data: response })
    })();
  }

  @logInfo
  private onCapture(event: any): void {
    void (async () => {
      this._cameraService.isReady = true;
      this._cameraService.eventEmitter.once('imageProcessing', (event) => {
        this.socket!.emit('capture', event);
      });
    })();
  }

}
