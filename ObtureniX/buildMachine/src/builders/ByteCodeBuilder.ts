import * as vm from 'vm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BuildConfig } from '../@types/Config';
import { Logger } from '../utils/Logger';


export class BytecodeBuilder {
  private config: BuildConfig;
  private logger: Logger;

  constructor(config: BuildConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  public async build(): Promise<boolean> {
    if (!this.config.output.bytecodeEnabled) {
      this.logger.info('Bytecode generation skipped');
      return true;
    }

    try {
      const bundlePath = path.join(this.config.output.bundleDir, 'bundle.js');
      const code = await fs.readFile(bundlePath, 'utf8');

      const script = new vm.Script(code, {
        produceCachedData: true,

      });

      if (script.cachedData) {
        const bytecodePath = path.join(
          this.config.output.bundleDir,
          'bundle.bytecode'
        );
        await fs.writeFile(bytecodePath, script.cachedData);
        
        // Validate bytecode
        try {
          new vm.Script(code, {
            cachedData: script.cachedData,

          });
          this.logger.success('Bytecode generation completed successfully');
          return true;
        } catch (error) {
          this.logger.error('Bytecode validation failed', error);
          return false;
        }
      }

      this.logger.error('Failed to generate bytecode');
      return false;
    } catch (error) {
      this.logger.error('Bytecode generation failed', error);
      return false;
    }
  }
}

