import chalk from 'chalk';

export class Logger {
  public info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  public success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  public error(message: string, error?: any): void {
    console.error(chalk.red('✗'), message);
    if (error) {
      console.error(chalk.red(error));
    }
  }

  public warning(message: string): void {
    console.warn(chalk.yellow('⚠'), message);
  }
}