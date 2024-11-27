import * as JavaScriptObfuscator from 'javascript-obfuscator';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BuildConfig, ObfuscationConfig } from '../@types/Config';
import { Logger } from '../utils/Logger';


export class ObfuscationBuilder {
  private config: BuildConfig;
  private logger: Logger;

  constructor(config: BuildConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  public async build(): Promise<boolean> {
    try {
      const files = await this.getJavaScriptFiles();
      const obfuscationConfig = this.getObfuscationConfig();

      for (const file of files) {
        await this.obfuscateFile(file, obfuscationConfig);
      }

      this.logger.success('Code obfuscation completed successfully');
      return true;
    } catch (error) {
      this.logger.error('Code obfuscation failed', error);
      return false;
    }
  }

  private async getJavaScriptFiles(): Promise<string[]> {
    const files = await fs.readdir(this.config.output.distDir);
    return files
      .filter(file => file.endsWith('.js'))
      .map(file => path.join(this.config.output.distDir, file));
  }

  private getObfuscationConfig(): ObfuscationConfig {
    return {
      compact: true,
      controlFlowFlattening: this.config.optimization.obfuscation,
      controlFlowFlatteningThreshold: 0.75,
      deadCodeInjection: this.config.optimization.deadCodeElimination,
      deadCodeInjectionThreshold: 0.4,
      debugProtection: true,
      stringArrayEncoding: ['base64'],
      stringArrayThreshold: 0.75,
      transformObjectKeys: true,
    };
  }

  private async obfuscateFile(
    filePath: string,
    obfuscationConfig: any
  ): Promise<void> {
    const code = await fs.readFile(filePath, 'utf8');
    const obfuscatedCode = JavaScriptObfuscator.obfuscate(
      code,
      obfuscationConfig
    ).getObfuscatedCode();

    const outputPath = path.join(
      this.config.output.bundleDir,
      path.basename(filePath)
    );
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, obfuscatedCode);
  }
}