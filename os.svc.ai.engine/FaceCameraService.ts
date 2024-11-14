import { Socket } from "socket.io";
import LoggerMixin from "../infrastructure/logger/LoggerMixin";
import FaceCamera from "./FaceCamera";
import FaceDetector from "../FaceDetector";
import FaceAngleCaptureEntity from "../entity/FaceCaptureEntity";

export default class FaceCameraService extends LoggerMixin {
    private static readonly FACE_ANGLES_CAPTURE: string[] = ['face', 'left', 'right', 'up', 'down']; 
    public isActive: boolean = false;
    private faceDetector: FaceDetector;
    private isCaptureMode: boolean = true;
    private isAngleCaptureFinished: boolean = false;
    private faceAngles: FaceAngleCaptureEntity[] = [];
    
    constructor(faceDetector: FaceDetector) {
        super();
        this.faceDetector = faceDetector;
    }

    public async stopCamera(){
        this.isActive = false;
        const response = await FaceCamera.releaseCamera();
        return response;
    }

    public async streamLiveView(socket: Socket): Promise<void> {
        let counter: number = 0;
        let index: number = 0;
        const face: string[] = []
      
        while (this.isActive && index < FaceCameraService.FACE_ANGLES_CAPTURE.length) {
            const base64Data: string = await FaceCamera.getCameraImage();
            const targetBox = await this.faceDetector.detectFace(base64Data);
      
            if (this.isCaptureMode && targetBox) {
                face.push(base64Data);
                counter++;

                if (counter >= 20) {
                    face.push(base64Data);
                    counter = 0;
                    index++;
                    if (index < FaceCameraService.FACE_ANGLES_CAPTURE.length) {
                        this.isAngleCaptureFinished = true;
                    } else {
                        socket.emit('myself-stream',{
                            data: base64Data, 
                            currentAngle: 'completed',
                            isAngleCaptureFinished: true
                        })
                        break;
                    }
                }
            }
        
            socket.emit('myself-stream', { 
                data: base64Data, 
                box: targetBox, 
                currentAngle: FaceCameraService.FACE_ANGLES_CAPTURE[index],
                isAngleCaptureFinished: this.isAngleCaptureFinished 
            });

            this.isAngleCaptureFinished = false;
        }
        
        this.faceDetector.findFace(face)
    }
}
    