export interface BuildConfig {
  projectPath: string;  // Chemin vers le projet à builder
  input: {
    entryPoint: string;  // Chemin relatif depuis projectPath
    tsConfig?: string;   // Chemin relatif depuis projectPath
  };
  output: {
    distDir: string;    // Chemin relatif ou absolu pour la sortie
    bundleDir: string;  // Chemin relatif ou absolu pour la sortie
    bytecodeEnabled: boolean;
  };
  optimization: {
    minification: boolean;
    obfuscation: boolean;
    deadCodeElimination: boolean;
  };
  advanced: {
    sourceMap: boolean;
    declaration: boolean;
    strict: boolean;
  };
}

export interface ObfuscationConfig {
  compact: boolean;
  controlFlowFlattening: boolean;
  deadCodeInjection: boolean;
  debugProtection: boolean;
  stringArrayEncoding: string[];
  [key: string]: any;
}
