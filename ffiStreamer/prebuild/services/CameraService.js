"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const napi_canon_cameras_1 = require("@dimensional/napi-canon-cameras");
const LoggerMixin_1 = __importDefault(require("../infrastructure/logger/LoggerMixin"));
const node_fs_1 = __importDefault(require("node:fs"));
const events_1 = require("events");
class CameraService extends LoggerMixin_1.default {
    constructor() {
        super();
        this.isStopped = false;
        this.cameraWarning = null;
        this.counter = 0;
        this.MAX_FRAME = 60;
        this.videoFrames = null;
        this.isReady = false;
        this.socket = null;
        this._camera = this._buildCameraInstance();
        this.eventEmitter = new events_1.EventEmitter();
        this.socket = null;
    }
    _buildCameraInstance() {
        let camera = null;
        try {
            camera = new napi_canon_cameras_1.Camera();
            napi_canon_cameras_1.cameraBrowser.setEventHandler((eventName, event) => __awaiter(this, void 0, void 0, function* () {
                switch (eventName) {
                    case napi_canon_cameras_1.CameraBrowser.EventName.DownloadRequest:
                        this.onDownloadRequest(event);
                        break;
                    case napi_canon_cameras_1.Camera.EventName.CameraDisconnect:
                        this.onCameraDisconnect();
                        break;
                    case napi_canon_cameras_1.Camera.EventName.LiveViewStart:
                        this.onLiveViewStart();
                        break;
                    case napi_canon_cameras_1.Camera.EventName.FocusInfo:
                        break;
                    default:
                        break;
                }
            }));
        }
        catch (error) {
            this.logError(error);
        }
        (0, napi_canon_cameras_1.watchCameras)();
        return camera;
    }
    onDownloadRequest(event) {
        const CameraFile = event.file;
        CameraFile.downloadToPath(CameraService.SESSION_FILE_PATH);
        this.eventEmitter.emit('processingComplete');
        const thumbnail = `${CameraService.SESSION_FILE_PATH}/thumbnail`;
        if (!node_fs_1.default.existsSync(thumbnail)) {
            node_fs_1.default.mkdirSync(thumbnail);
        }
        this.logInfo(`Downloaded ${CameraFile.name}.`);
    }
    onCameraDisconnect() {
        this.logError("Afficher un message d'erreur");
    }
    onLiveViewStart() {
        if (this.socket) {
            this.processLiveView(this.socket);
        }
        else {
            this.cameraWarning = "<t>Camera was not properly truned off</t>";
            this._camera.stopLiveView();
        }
    }
    connect() {
        return new Promise((resolve, reject) => {
            try {
                this._camera.connect();
                const property = this._camera.getProperty(napi_canon_cameras_1.CameraProperty.ID.BatteryLevel);
                this._camera.setProperties({
                    [napi_canon_cameras_1.CameraProperty.ID.SaveTo]: napi_canon_cameras_1.Option.SaveTo.Host,
                    [napi_canon_cameras_1.CameraProperty.ID.ImageQuality]: napi_canon_cameras_1.ImageQuality.ID.LargeJPEGFine,
                });
                this.logInfo(`Camera ${this._camera.description} connected`);
                this.logInfo(`Camera BatteryLevel ${property.value} %`);
                resolve(true);
            }
            catch (error) {
                this.logError(error.message);
                reject(false);
            }
        });
    }
    disconnect() {
        this._camera.disconnect();
    }
    takePhoto() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.isStopped = true;
                this.stopStream();
                this._camera.takePicture();
                yield new Promise((resolve) => {
                    this.eventEmitter.once('processingComplete', () => {
                        this.logInfo('Opération terminée');
                        resolve();
                    });
                });
                return "OK";
            }
            catch (error) {
                this.logError(`${error}`);
                if (error.message === "EDSDK - TAKE_PICTURE_AF_NG") {
                    return "AF_ERROR";
                }
                else if (error.message === "EDSDK - DEVICE_BUSY") {
                    return "DEVICE_BUSY";
                }
                else {
                    this.logError(`${error}`);
                    throw new Error("Erreur lors de la prise de photo");
                }
            }
        });
    }
    streamLiveView(socket) {
        return __awaiter(this, void 0, void 0, function* () {
            this.socket = socket;
            this.isStopped = false;
            this._camera.startLiveView();
        });
    }
    processLiveView(socket) {
        return __awaiter(this, void 0, void 0, function* () {
            while (this._camera.isLiveViewActive() && !this.isStopped) {
                try {
                    const streamImg = this._camera.getLiveViewImage();
                    const base64Data = streamImg.getDataURL();
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
                        }
                        else {
                            this.stopStream();
                            this.isReady = false;
                            this.counter = 0;
                            if (this.videoFrames) {
                                this.videoFrames = null;
                            }
                        }
                    }
                    socket.emit('stream', { data: base64Data });
                    yield this.sleep(0);
                }
                catch (error) {
                    if (error.message === "EDSDK - OBJECT_NOTREADY")
                        socket.emit('stream', { data: 'OBJECT_NOTREADY' });
                }
            }
        });
    }
    focus() {
        this._camera.sendCommand(napi_canon_cameras_1.Camera.Command.PressShutterButton, napi_canon_cameras_1.Camera.PressShutterButton.Halfway);
    }
    stopStream() {
        this._camera.sendCommand(napi_canon_cameras_1.Camera.Command.PressShutterButton, napi_canon_cameras_1.Camera.PressShutterButton.OFF);
        this.isStopped = true;
        this._camera.stopLiveView();
    }
    sleep(time) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => setTimeout(() => resolve(), time));
        });
    }
}
CameraService.SESSION_FILE_PATH = "";
exports.default = CameraService;
