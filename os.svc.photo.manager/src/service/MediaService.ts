import fs from 'fs';
import path from 'path';
import * as fsExtra from 'fs-extra';
// import sharp from 'sharp';
import { HttpResponse } from '../controller/ControllerInterface';
import HttpStatusCodes from '../utils/HttpStatusCode';


export default class MediaService {
    private static readonly ROOT_PATH: string = path.join(__dirname, '..', '..', 'public','tmp/');

    public getPhoto(sessionID: string) {
        try {
            if (fs.existsSync(MediaService.ROOT_PATH + sessionID)) {
                let files: string[] = fs.readdirSync(MediaService.ROOT_PATH + sessionID);
                files = files.filter(file => {
                    const ext = path.extname(file).toLowerCase();
                    return ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.gif';
                });
                files = files.reverse();

                if (files.length > 0) {
                    const firstFile = files[0];
                    const filePath = path.join(MediaService.ROOT_PATH + sessionID, firstFile);
                    const fileName = path.basename(firstFile);
                    const imageData = fs.readFileSync(filePath, { encoding: 'base64' });
                    const dataImage: string = 'data:image/jpeg;base64,' + imageData;
                    return { message: { image: dataImage, file: fileName, type: "image" }, status: HttpStatusCodes.OK };
                } else {
                    throw new Error(`Le répertoire '${MediaService.ROOT_PATH + sessionID}' ne contient pas d'images.`);
                }
            } else {
                throw new Error(`Le répertoire '${MediaService.ROOT_PATH + sessionID}' n'existe pas.`);
            }
        } catch (error) {
           return this.handleError(error);
        }
    }

    public deleteAllPhotos(): HttpResponse {
        try {
            if (fs.existsSync(MediaService.ROOT_PATH)) {
                fsExtra.emptyDirSync(MediaService.ROOT_PATH);
                return { message: 'OK', status: HttpStatusCodes.OK };
            } else {
                throw new Error(`Le répertoire '${MediaService.ROOT_PATH}' n'existe pas.`);
            }
        } catch (error) {
            return this.handleError(error);
        }
    }

    public deletePhotos(photoPaths: string[], sessionID: string): HttpResponse {
        const fileType: string = photoPaths[0].split('.')[1]
        let isFileVideo: boolean = fileType === "mov" ? true : false;
        try {
            for (const photoPath of photoPaths) {
                if (fs.existsSync(`${MediaService.ROOT_PATH}/${sessionID}/${isFileVideo ? `vid/${photoPath}` : photoPath}`)) {
                    fs.unlinkSync(`${MediaService.ROOT_PATH}/${sessionID}/${isFileVideo ? `vid/${photoPath}` : photoPath}`);
                    console.log(`Fichier '${path.basename(photoPath)}' supprimé avec succès.`);
                } else {
                    throw new Error(`Le fichier '${photoPath}' n'existe pas.`);
                }
            }
            console.log('Toutes les photos ont été supprimées.');
            return { message: 'OK', status: HttpStatusCodes.OK };
        } catch (error) {
            return this.handleError(error);
        }
    }


    public getBoomerangVideo(sessionID: string): HttpResponse {
        const videoPath: string = path.join(MediaService.ROOT_PATH, sessionID, 'vid');

        try {
            if (fs.existsSync(videoPath)) {
                let files: string[] = fs.readdirSync(videoPath);
                files = files.filter(file => {

                    const ext = path.extname(file).toLowerCase();
                    return ext === '.mov';
                });
                files = files.reverse();

                if (files.length > 0) {
                    const firstFile = files[0];
                    const filePath: string = path.join(videoPath, firstFile);
                    const fileName: string = path.basename(firstFile);
                    const videoData: Buffer = fs.readFileSync(filePath);
                    return { message: { video: videoData, file: fileName, type: "video" }, status: HttpStatusCodes.OK };
                } else {
                    throw new Error(`Le répertoire '${videoPath}' ne contient pas d'video.`);
                }
            } else {
                throw new Error(`Le répertoire '${videoPath}' n'existe pas.`);
            }
        } catch (error) {
            console.log('Une erreur s\'est produite lors de la récupération de la video :', error);
            return this.handleError(error);
        }

    }
    private async _thumbnail(inputPath: string, outputPath: string, width: number, height: number) {
        // await sharp(inputPath)
        //     .resize({ width, height, fit: 'inside' })
        //     .toFormat('jpeg')
        //     .jpeg({ quality: 80 })
        //     .toFile(outputPath);
        // sharp.cache(false);
    }

    private handleError(error: any): HttpResponse {
        if (error) {
          return { message: error.message, status: error.status || 500 };
        } else {
          return { message: 'Internal Server Error', status: 500 };
        }
      }
}
