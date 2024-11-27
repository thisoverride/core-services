import path from 'path';

export class PathResolver {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = path.resolve(projectPath);
  }

  public resolveInputPath(inputPath: string): string {
    if (path.isAbsolute(inputPath)) {
      return inputPath;
    }
    return path.resolve(this.projectPath, inputPath);
  }

  public resolveOutputPath(outputPath: string): string {
    if (path.isAbsolute(outputPath)) {
      return outputPath;
    }
    return path.resolve(process.cwd(), outputPath);
  }

  public resolveConfigPath(configPath?: string): string {
    if (!configPath) {
      return path.resolve(this.projectPath, 'tsconfig.json');
    }
    return this.resolveInputPath(configPath);
  }
}