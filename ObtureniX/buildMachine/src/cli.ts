import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';
import { BuildMachine } from './BuildMachine';
import { BuildConfig } from './@types/Config';

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option('project', {
      alias: 'p',
      type: 'string',
      description: 'Path to the project to build',
      demandOption: true
    })
    .option('entry', {
      alias: 'e',
      type: 'string',
      description: 'Entry point file (relative to project path)',
      demandOption: true
    })
    .option('tsconfig', {
      type: 'string',
      description: 'Path to tsconfig.json (relative to project path)'
    })
    .option('dist', {
      type: 'string',
      description: 'Distribution directory',
      default: 'dist'
    })
    .option('build', {
      type: 'string',
      description: 'Build output directory',
      default: 'build'
    })
    .option('bytecode', {
      type: 'boolean',
      description: 'Enable bytecode generation',
      default: false
    })
    .option('minify', {
      type: 'boolean',
      description: 'Enable minification',
      default: true
    })
    .option('obfuscate', {
      type: 'boolean',
      description: 'Enable code obfuscation',
      default: false
    })
    .argv;

  const config: BuildConfig = {
    projectPath: path.resolve(argv.project),
    input: {
      entryPoint: argv.entry,
      tsConfig: argv.tsconfig,
    },
    output: {
      distDir: argv.dist,
      bundleDir: argv.build,
      bytecodeEnabled: argv.bytecode,
    },
    optimization: {
      minification: argv.minify,
      obfuscation: argv.obfuscate,
      deadCodeElimination: true,
    },
    advanced: {
      sourceMap: false,
      declaration: false,
      strict: true,
    },
  };

  const buildMachine = new BuildMachine(config);
  const success = await buildMachine.build();
  process.exit(success ? 0 : 1);
}
