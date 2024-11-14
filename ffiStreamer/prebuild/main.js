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
const FFIEventController_1 = __importDefault(require("./eventController/FFIEventController"));
const CameraService_1 = __importDefault(require("./services/CameraService"));
const socket_io_1 = require("socket.io");
const http_1 = require("http");
class Main {
    constructor() {
        this._server = (0, http_1.createServer)();
    }
    applicationInitializer() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cs = new CameraService_1.default();
                yield cs.connect();
                const io = new socket_io_1.Server(this._server, {
                    cors: {
                        origin: "*"
                    },
                    perMessageDeflate: false
                });
                new FFIEventController_1.default(cs, io);
            }
            catch (error) {
                throw new Error(`${error}`);
            }
        });
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.applicationInitializer().then(() => {
                this._server.listen(3000, () => {
                    console.log('ffi-stream is listening');
                });
            }).catch((error) => {
                console.error(error);
                process.exit();
            });
        });
    }
}
const main = new Main();
main.run();
