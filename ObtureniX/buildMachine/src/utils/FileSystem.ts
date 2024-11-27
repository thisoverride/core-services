import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { Logger } from './Logger';

export class FileSystem {
  private static logger = new Logger();

  /**
   * Vérifie si un chemin existe
   */
  public static existsSync(path: string): boolean {
    try {
      return fsSync.existsSync(path);
    } catch (error) {
      this.logger.error(`Error checking path existence: ${path}`, error);
      return false;
    }
  }

  /**
   * Vérifie si un chemin existe de manière asynchrone
   */
  public static async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Crée un répertoire et ses parents si nécessaire
   */
  public static async ensureDir(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      this.logger.error(`Error creating directory: ${dir}`, error);
      throw error;
    }
  }

  /**
   * Nettoie ou crée un répertoire
   */
  public static async cleanDir(dir: string): Promise<void> {
    try {
      if (await this.exists(dir)) {
        await fs.rm(dir, { recursive: true, force: true });
      }
      await this.ensureDir(dir);
    } catch (error) {
      this.logger.error(`Error cleaning directory: ${dir}`, error);
      throw error;
    }
  }

  /**
   * Écrit un fichier en créant les répertoires parents si nécessaire
   */
  public static async writeFile(
    filePath: string, 
    content: string | Buffer,
    options?: fsSync.WriteFileOptions
  ): Promise<void> {
    try {
      await this.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content, options);
    } catch (error) {
      this.logger.error(`Error writing file: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Lit un fichier
   */
  public static async readFile(
    filePath: string,
    options?: { encoding?: BufferEncoding; flag?: string }
  ): Promise<string | Buffer> {
    try {
      return await fs.readFile(filePath, options);
    } catch (error) {
      this.logger.error(`Error reading file: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Liste les fichiers d'un répertoire
   */
  public static async listFiles(
    dir: string,
    options?: {
      pattern?: RegExp;
      recursive?: boolean;
    }
  ): Promise<string[]> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files: string[] = [];

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && options?.recursive) {
          const subFiles = await this.listFiles(fullPath, options);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          if (!options?.pattern || options.pattern.test(entry.name)) {
            files.push(fullPath);
          }
        }
      }

      return files;
    } catch (error) {
      this.logger.error(`Error listing files in directory: ${dir}`, error);
      throw error;
    }
  }

  /**
   * Copie un fichier
   */
  public static async copyFile(src: string, dest: string): Promise<void> {
    try {
      await this.ensureDir(path.dirname(dest));
      await fs.copyFile(src, dest);
    } catch (error) {
      this.logger.error(`Error copying file from ${src} to ${dest}`, error);
      throw error;
    }
  }

  /**
   * Copie un répertoire de manière récursive
   */
  public static async copyDir(src: string, dest: string): Promise<void> {
    try {
      await this.ensureDir(dest);
      const entries = await fs.readdir(src, { withFileTypes: true });

      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          await this.copyDir(srcPath, destPath);
        } else {
          await this.copyFile(srcPath, destPath);
        }
      }
    } catch (error) {
      this.logger.error(`Error copying directory from ${src} to ${dest}`, error);
      throw error;
    }
  }

  /**
   * Supprime un fichier ou un répertoire
   */
  public static async remove(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
    try {
      await fs.rm(path, options);
    } catch (error) {
      this.logger.error(`Error removing path: ${path}`, error);
      throw error;
    }
  }

  /**
   * Obtient les statistiques d'un fichier
   */
  public static async stat(path: string): Promise<fsSync.Stats> {
    try {
      return await fs.stat(path);
    } catch (error) {
      this.logger.error(`Error getting stats for path: ${path}`, error);
      throw error;
    }
  }
}