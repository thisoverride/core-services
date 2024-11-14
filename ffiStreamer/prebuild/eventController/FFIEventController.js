"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
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
const LoggerMixin_1 = __importDefault(require("../infrastructure/logger/LoggerMixin"));
const ffitrace_1 = require("../decorator/ffitrace");
class FFIEventController extends LoggerMixin_1.default {
    constructor(cameraService, io) {
        super();
        this.cameraService = cameraService;
        this.socket = null;
        this.isMaxConnexion = false;
        this._io = io;
        this._io.on('connection', this._onConnection.bind(this));
        this._cameraService = cameraService;
    }
    _onConnection(socket) {
        this.socket = socket;
        if (this.isMaxConnexion) {
            this.logWarn('Connection rejected: Maximum client limit reached');
            this.socket.disconnect(true);
            return;
        }
        this.logInfo('Client connected');
        this.isMaxConnexion = true;
        this.socket.on('disconnect', () => __awaiter(this, void 0, void 0, function* () {
            this.logInfo('Client disconnected');
            this.isMaxConnexion = false;
            this.cameraService.stopStream();
        }));
        this.socket.on('stream', this.onStream.bind(this));
        this.socket.on('close-stream', this.onCloseStream.bind(this));
        this.socket.on('shooting', this.onShooting.bind(this));
        this.socket.on('capture', this.onCapture.bind(this));
    }
    onStream(event) {
        void (() => __awaiter(this, void 0, void 0, function* () { return yield this._cameraService.streamLiveView(this.socket); }))();
    }
    onCloseStream(event) {
        this._cameraService.stopStream();
    }
    onShooting(event) {
        void (() => __awaiter(this, void 0, void 0, function* () {
            const response = yield this._cameraService.takePhoto();
            this.socket.emit('shooting', { data: response });
        }))();
    }
    onCapture(event) {
        void (() => __awaiter(this, void 0, void 0, function* () {
            this._cameraService.isReady = true;
            this._cameraService.eventEmitter.once('imageProcessing', (event) => {
                this.socket.emit('capture', event);
            });
        }))();
    }
}
exports.default = FFIEventController;
__decorate([
    ffitrace_1.logInfo,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FFIEventController.prototype, "onStream", null);
__decorate([
    ffitrace_1.logInfo,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FFIEventController.prototype, "onCloseStream", null);
__decorate([
    ffitrace_1.logInfo,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FFIEventController.prototype, "onShooting", null);
__decorate([
    ffitrace_1.logInfo,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FFIEventController.prototype, "onCapture", null);
