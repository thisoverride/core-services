import FFIEventController from './eventController/FFIEventController';
import CameraService from './services/CameraService';
import { Server } from 'socket.io';
import {  createServer } from 'http'; 

class Main {
    private readonly _server: any;

    constructor() {
        this._server = createServer();
    }

    private async applicationInitializer(): Promise<void> {
        try {
            const cs: CameraService = new CameraService();
            await cs.connect();
            const io: Server = new Server(this._server,{
                cors: {
                  origin: "*"
                },
                perMessageDeflate: false
              });
            new FFIEventController(cs, io);
        } catch (error) {
            throw new Error(`${error}`)
        }
    }

    public async run(): Promise<void> {
        await this.applicationInitializer().then(()=> {
            this._server.listen(3000, () => {  
                console.log('ffi-stream is listening');
            });
        }).catch((error)=> {
            console.error(error);
            process.exit()
        })
       
    }
}

const main = new Main();
main.run(); 