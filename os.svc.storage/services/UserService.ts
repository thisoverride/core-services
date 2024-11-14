import path from 'path';
import fs from 'fs';

export default class UserService {

  public renderStorage(id: string): string[] {
    const userID: string = id;
    const cheminDossier: string = path.join(__dirname, '..', '..', 'public', 'assets', 'ressources', userID);
    const cheminsImages: string[] = [];

    if (!fs.existsSync(cheminDossier) || !fs.statSync(cheminDossier).isDirectory()) {
        console.error(`${cheminDossier} n'est pas un dossier valide.`);
        return cheminsImages;
    }

    try {
        const contenu: string[] = fs.readdirSync(cheminDossier);
        contenu.forEach(element => {
            const cheminImage: string = path.join(cheminDossier, element);
            if (/\.((png)|(jpg)|(jpeg)|(gif))$/i.test(element) && fs.statSync(cheminImage).isFile()) {
                const cheminRelatif: string = '/' + path.relative(path.join(__dirname, '..', '..', 'public'), cheminImage);
                cheminsImages.push(cheminRelatif);
            }
        });
    } catch (erreur) {
        console.error(`Une erreur s'est produite lors de la lecture du dossier ${cheminDossier}:`, erreur);
    }

    return cheminsImages;
  }

}
