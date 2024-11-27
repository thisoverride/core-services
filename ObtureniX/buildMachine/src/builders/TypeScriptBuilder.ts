import * as ts from 'typescript';
import { BuildConfig } from '../@types/Config';
import { Logger } from '../utils/Logger';


export class TypeScriptBuilder {
  private config: BuildConfig;
  private logger: Logger;

  constructor(config: BuildConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  public async build(): Promise<boolean> {
    try {
      const tsConfig = this.loadTsConfig();
      const program = ts.createProgram([this.config.input.entryPoint], tsConfig);
      const emitResult = program.emit();

      const diagnostics = ts
        .getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics);

      if (diagnostics.length > 0) {
        this.logDiagnostics(diagnostics);
        return false;
      }

      this.logger.success('TypeScript compilation completed successfully');
      return true;
    } catch (error) {
      this.logger.error('TypeScript compilation failed', error);
      return false;
    }
  }

  private loadTsConfig(): ts.CompilerOptions {
    const configPath = this.config.input.tsConfig || './tsconfig.json';
    const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
    const { options } = ts.parseJsonConfigFileContent(
      config,
      ts.sys,
      process.cwd()
    );
    
    return {
      ...options,
      sourceMap: this.config.advanced.sourceMap,
      declaration: this.config.advanced.declaration,
      strict: this.config.advanced.strict,
      outDir: this.config.output.distDir,
    };
  }

  private logDiagnostics(diagnostics: readonly ts.Diagnostic[]): void {
    diagnostics.forEach(diagnostic => {
      let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      if (diagnostic.file) {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
        message = `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`;
      }
      this.logger.error(message);
    });
  }
}