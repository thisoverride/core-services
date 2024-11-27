import { Configuration, webpack } from 'webpack';
import path from 'path';
import TerserPlugin from 'terser-webpack-plugin';
import nodeExternals from 'webpack-node-externals';
import { BuildConfig } from '../@types/Config';
import { Logger } from '../utils/Logger';

export class WebpackBuilder {
  private config: BuildConfig;
  private logger: Logger;

  constructor(config: BuildConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  public async build(): Promise<boolean> {
    return new Promise((resolve) => {
      const webpackConfig = this.createWebpackConfig();
      webpack(webpackConfig, (err, stats) => {
        if (err || stats?.hasErrors()) {
          this.logger.error('Webpack bundling failed', err || stats?.toString({
            colors: true,
            chunks: false,
            modules: false
          }));
          resolve(false);
        } else {
          this.logger.success('Webpack bundling completed successfully');
          if (stats) {
            this.logger.info(stats.toString({
              colors: true,
              chunks: false,
              modules: false,
              assets: true,
              entrypoints: false
            }));
          }
          resolve(true);
        }
      });
    });
  }

  private createWebpackConfig(): Configuration {
    return {
      mode: 'production',
      entry: this.config.input.entryPoint,
      target: 'node',
      externals: [nodeExternals()],
      
      output: {
        path: this.config.output.bundleDir,
        filename: 'bundle.js',
        clean: true
      },

      resolve: {
        extensions: ['.ts', '.js', '.json'],
        alias: {
          '@': path.resolve(process.cwd(), 'src')
        }
      },

      optimization: {
        minimize: this.config.optimization.minification,
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              format: {
                comments: false,
              },
              compress: {
                dead_code: true,
                drop_console: this.config.optimization.deadCodeElimination,
                drop_debugger: true,
                pure_funcs: this.config.optimization.deadCodeElimination ? ['console.log', 'console.info', 'console.debug'] : [],
                passes: 2
              },
              mangle: {
                toplevel: true,
                keep_classnames: false,
                keep_fnames: false
              }
            },
            extractComments: false
          }),
        ],
        usedExports: true,
        sideEffects: true
      },

      module: {
        rules: [
          {
            test: /\.[tj]s$/,
            exclude: /node_modules/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: [
                  ['@babel/preset-env', {
                    targets: {
                      node: 'current'
                    },
                    modules: false
                  }],
                  '@babel/preset-typescript'
                ],
                plugins: [
                  '@babel/plugin-proposal-class-properties',
                  '@babel/plugin-proposal-object-rest-spread'
                ]
              }
            }
          }
        ]
      },

      stats: {
        assets: true,
        colors: true,
        hash: true,
        timings: true,
        chunks: false,
        chunkModules: false,
        modules: false,
        children: false,
        warnings: true
      },

      performance: {
        hints: false
      },

      node: {
        __dirname: false,
        __filename: false
      }
    };
  }
}


