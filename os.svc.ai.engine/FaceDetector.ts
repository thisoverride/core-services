import canvas from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import * as log from '@vladmandic/pilogger';
import * as tf from '@tensorflow/tfjs-node';
import * as faceapi from '@vladmandic/face-api';
// import { img64 } from './test';
import { v4 as uuidv4 } from 'uuid';


export default class FaceDetector {
    private modelPathRoot = '../model';
    private optionsSSDMobileNet:  faceapi.SsdMobilenetv1Options;

    constructor(){
      faceapi.env.monkeyPatch({
        Canvas: canvas.Canvas as unknown as { new (): HTMLCanvasElement; prototype: HTMLCanvasElement },
        Image: canvas.Image as unknown as { new (): HTMLImageElement; prototype: HTMLImageElement },
        ImageData: canvas.ImageData as unknown as { new (sw: number, sh: number, settings?: ImageDataSettings | undefined): ImageData; new (data: Uint8ClampedArray, sw: number, sh?: number | undefined, settings?: ImageDataSettings | undefined): ImageData; prototype: ImageData }
    });
    this.optionsSSDMobileNet = new faceapi.SsdMobilenetv1Options({ minConfidence : 0.1, maxResults: 1 });
    new faceapi.TinyYolov2Options()
    }

    private async image(input: string) {
      const img = await canvas.loadImage(input);
      const c = canvas.createCanvas(img.width, img.height);
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, img.width, img.height);
      return c;
  }

      public detectFace(img64: string): Promise<any> {
        return new Promise(async (resolve, reject) => {
            try {
                const t0 = process.hrtime.bigint();
                const c = await this.image(img64) as any;
                const result = await faceapi.detectSingleFace(c, new faceapi.TinyFaceDetectorOptions());
          
                const t1 = process.hrtime.bigint();
                log.info('Processed', Math.trunc(Number((t1 - t0).toString()) / 1000 / 1000), 'ms');
                resolve(result); 
            } catch (error) {
                reject(error); 
            }
        });
    }

    private extractFace(): void {

    }

      public async initialization(): Promise<void> {
        log.info('Loading FaceAPI models');
        const modelPath = path.join(__dirname, this.modelPathRoot);
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath),
          
        
          faceapi.nets.faceExpressionNet.loadFromDisk(modelPath),
          faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath),
          faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath),
          faceapi.nets.faceExpressionNet.loadFromDisk(modelPath),
          faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath),
        ]);
      await (faceapi.tf as any).setBackend('tensorflow');
      await (faceapi.tf as any).ready();
      }

      public async unloadModels(): Promise<void> {
        await (faceapi.tf as any).disposeVariables();
        await (faceapi.tf as any).setBackend('cpu');
        await (faceapi.tf as any).ready();
        log.info('Models unloaded');
    }
    

    public async findFace(faceAngles: string[]) {
      const outputFolder = './test';
  
      console.log(faceAngles.length);
      faceAngles.forEach((item) => {
          try {
              if (!fs.existsSync(outputFolder)) {
                  fs.mkdirSync(outputFolder, { recursive: true });
              }
  
              const outputFile: string = path.join(outputFolder, `${uuidv4()}.jpg`);
              const base64Image: string = item.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
  
              fs.writeFileSync(outputFile, base64Image, { encoding: 'base64' });
  
              console.log(`L'image a été enregistrée dans ${outputFile}.`);
          } catch (error) {
              console.error("Une erreur s'est produite :", error);
          }
      });
  }

  
    
}

