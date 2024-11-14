import path from 'path';
import fs from 'fs';

export default class ApplicationService {

  public updateStorage(id: string, blob: string){
    const userID: string = id;
    const folderPath: string = path.join(__dirname, '..', '..', 'public', 'assets', 'ressources', userID);

    // Vérifier si le dossier existe, sinon le créer
    if (!fs.existsSync(folderPath)) {
      return false
    }
    
    // Générer un nom de fichier unique pour la photo
    const photoName: string = `${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
    const filePath: string = path.join(folderPath, photoName);

    // Convertir le blob en données binaires
    const imageBuffer: Buffer = Buffer.from(blob, 'base64');

    // Enregistrer les données binaires dans un fichier
    fs.writeFile(filePath, imageBuffer, (err) => {
        if (err) {
            console.error('Erreur lors de l\'enregistrement de la photo :', err);
        } else {
            console.log('Photo enregistrée avec succès :', filePath);
        }
    });
  }

}
