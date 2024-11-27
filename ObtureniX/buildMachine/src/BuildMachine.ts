import { BuildConfig } from "./@types/Config";
import { BytecodeBuilder } from "./builders/ByteCodeBuilder";
import { ObfuscationBuilder } from "./builders/ObfuscationBuilder";
import { TypeScriptBuilder } from "./builders/TypeScriptBuilder";
import { WebpackBuilder } from "./builders/WebpackBuilder";
import { Logger } from "./utils/Logger";
import path from 'path';
import { PathResolver } from './utils/PathResolver';
import { FileSystem } from './utils/FileSystem';


export class BuildMachine {
  private config: BuildConfig;
  private logger: Logger;
  private pathResolver: PathResolver;
  private initialized: boolean = false;

  constructor(config: BuildConfig) {
    this.logger = new Logger();
    this.pathResolver = new PathResolver(config.projectPath);
    
    // Assignation initiale de la config sans validation
    this.config = {
      ...config,
      output: {
        distDir: config.output.distDir || 'dist',
        bundleDir: config.output.bundleDir || 'build',
        bytecodeEnabled: config.output.bytecodeEnabled ?? false,
      },
      optimization: {
        minification: config.optimization.minification ?? true,
        obfuscation: config.optimization.obfuscation ?? false,
        deadCodeElimination: config.optimization.deadCodeElimination ?? true,
      },
      advanced: {
        sourceMap: config.advanced.sourceMap ?? false,
        declaration: config.advanced.declaration ?? false,
        strict: config.advanced.strict ?? true,
      },
    };
  }

  private async validateConfig(): Promise<void> {
    if (!this.config.projectPath) {
      throw new Error('Project path is required');
    }
    if (!this.config.input.entryPoint) {
      throw new Error('Entry point is required');
    }

    // Vérifier que le projet existe
    const projectPath = path.resolve(this.config.projectPath);
    if (!await FileSystem.exists(projectPath)) {
      throw new Error(`Project directory not found: ${projectPath}`);
    }

    // Vérifier que le point d'entrée existe
    const entryPoint = path.resolve(projectPath, this.config.input.entryPoint);
    if (!await FileSystem.exists(entryPoint)) {
      throw new Error(`Entry point not found: ${entryPoint}`);
    }

    // Vérifier le tsconfig si spécifié
    if (this.config.input.tsConfig) {
      const tsConfigPath = this.pathResolver.resolveConfigPath(this.config.input.tsConfig);
      if (!await FileSystem.exists(tsConfigPath)) {
        throw new Error(`tsconfig.json not found: ${tsConfigPath}`);
      }
    }
  }

  private async initialize(): Promise<void> {
    if (!this.initialized) {
      await this.validateConfig();
      this.initialized = true;
    }
  }

  public async build(): Promise<boolean> {
    try {
      await this.initialize();

      this.logger.info(`Building project at: ${this.config.projectPath}`);
      this.logger.info(`Entry point: ${this.pathResolver.resolveInputPath(this.config.input.entryPoint)}`);

      // Résoudre tous les chemins
      const resolvedConfig: BuildConfig = {
        ...this.config,
        input: {
          entryPoint: this.pathResolver.resolveInputPath(this.config.input.entryPoint),
          tsConfig: this.config.input.tsConfig 
            ? this.pathResolver.resolveConfigPath(this.config.input.tsConfig)
            : undefined
        },
        output: {
          ...this.config.output,
          distDir: this.pathResolver.resolveOutputPath(this.config.output.distDir),
          bundleDir: this.pathResolver.resolveOutputPath(this.config.output.bundleDir)
        }
      };

      // Nettoyer les répertoires de sortie
      await FileSystem.cleanDir(resolvedConfig.output.distDir);
      await FileSystem.cleanDir(resolvedConfig.output.bundleDir);

      // Exécuter les builders
      const builders = [
        new TypeScriptBuilder(resolvedConfig, this.logger),
        ...(resolvedConfig.optimization.obfuscation ? [new ObfuscationBuilder(resolvedConfig, this.logger)] : []),
        new WebpackBuilder(resolvedConfig, this.logger),
        ...(resolvedConfig.output.bytecodeEnabled ? [new BytecodeBuilder(resolvedConfig, this.logger)] : [])
      ];

      for (const builder of builders) {
        if (!await builder.build()) {
          return false;
        }
      }

      this.logger.success('Build completed successfully');
      return true;
    } catch (error) {
      this.logger.error('Build failed', error);
      return false;
    }
  }

  // Méthode utilitaire pour obtenir la configuration actuelle
  public getConfig(): BuildConfig {
    return { ...this.config };
  }
}