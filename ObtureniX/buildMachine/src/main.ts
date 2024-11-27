// Structure du projet exemple à compiler :
// /projects/my-typescript-api/
// ├── src/
// │   ├── models/
// │   │   └── User.ts
// │   ├── services/
// │   │   └── UserService.ts
// │   ├── controllers/
// │   │   └── UserController.ts
// │   └── index.ts
// ├── tsconfig.json
// └── package.json

// Voici le script qui utilise la machine de build pour compiler ce projet :
// build-script.ts

import { BuildMachine } from  './BuildMachine'
import path from 'path';
import chalk from 'chalk';

async function buildTypescriptProject() {
  try {
    // Configuration de la machine de build
    const config = {
      projectPath: '../systemXctrl',
      input: {
        entryPoint: 'src/main.ts',
        tsConfig: 'tsconfig.json'
      },
      output: {
        distDir: './dist',
        bundleDir: './build',
        bytecodeEnabled: true
      },
      optimization: {
        minification: true,
        obfuscation: true,
        deadCodeElimination: true
      },
      advanced: {
        sourceMap: process.env.NODE_ENV !== 'production',
        declaration: true,
        strict: true
      }
    };

    console.log(chalk.blue('🚀 Starting build process...'));
    console.log(chalk.gray(`Project path: ${config.projectPath}`));
    console.log(chalk.gray(`Entry point: ${config.input.entryPoint}`));

    const buildMachine = new BuildMachine(config);
    
    // Lancer la build
    const startTime = Date.now();
    const success = await buildMachine.build();
    const duration = Date.now() - startTime;

    if (success) {
      console.log(chalk.green(`✨ Build completed successfully in ${duration}ms`));
      
      // Afficher les détails de la build
      const finalConfig = buildMachine.getConfig();
      console.log(chalk.yellow('\nBuild details:'));
      console.log(chalk.gray(`📁 Output directory: ${finalConfig.output.distDir}`));
      console.log(chalk.gray(`📦 Bundle directory: ${finalConfig.output.bundleDir}`));
      console.log(chalk.gray(`🔧 Optimization:`));
      console.log(chalk.gray(`   - Minification: ${finalConfig.optimization.minification}`));
      console.log(chalk.gray(`   - Obfuscation: ${finalConfig.optimization.obfuscation}`));
      console.log(chalk.gray(`   - Dead code elimination: ${finalConfig.optimization.deadCodeElimination}`));
      
      if (finalConfig.output.bytecodeEnabled) {
        console.log(chalk.gray(`📜 Bytecode generated: ${path.join(finalConfig.output.bundleDir, 'bundle.bytecode')}`));
      }
    } else {
      console.log(chalk.red('❌ Build failed'));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('❌ Build error:'), error);
    process.exit(1);
  }
}

// Script pour exécuter la build avec différents environnements
async function main() {
  const args = process.argv.slice(2);
  const env = args[0] || 'development';
  
  console.log(chalk.cyan(`🔧 Building for ${env} environment`));
  
  // Configurer l'environnement
  process.env.NODE_ENV = env;
  
  await buildTypescriptProject();
}

main().catch(console.error);

// Pour tester la build, créons un petit projet exemple :

// /projects/my-typescript-api/src/models/User.ts
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: Date;
}

