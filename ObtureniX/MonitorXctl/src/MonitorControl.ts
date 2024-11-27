import { exec } from 'child_process';
import { promisify } from 'util';
import { MonitorInfo } from '../@type/global';

export enum Rotation {
  NORMAL = 0,
  RIGHT = 90,
  INVERTED = 180,
  LEFT = 270
}

export class MonitorControl {
  private static execAsync = promisify(exec);
  private static readonly BRIGHTNESS_FILE = '/sys/class/backlight/intel_backlight/brightness';
  private static readonly MAX_BRIGHTNESS_FILE = '/sys/class/backlight/intel_backlight/max_brightness';

  public static async getMonitors(): Promise<MonitorInfo[]> {
    try {
      const { stdout } = await this.execAsync('xrandr --query');
      return this.parseXrandrOutput(stdout);
    } catch (error) {
      throw this.handleError(error, 'Failed to get monitors');
    }
  }

  public static async setBrightness(monitor: string, level: number): Promise<void> {
    if (level < 0 || level > 100) {
      throw new Error('Brightness must be between 0 and 100');
    }

    try {
      const maxBrightness = await this.getMaxBrightness();
      const value = Math.round((level / 100) * maxBrightness);
      await this.execAsync(`sudo tee ${this.BRIGHTNESS_FILE} <<< "${value}"`);
    } catch (error) {
      throw this.handleError(error, 'Failed to set brightness');
    }
  }

  public static async setResolution(monitor: string, width: number, height: number, rate?: number): Promise<void> {
    try {
      let command = `xrandr --output ${monitor} --mode ${width}x${height}`;
      if (rate) {
        command += ` --rate ${rate}`;
      }
      await this.execAsync(command);
    } catch (error) {
      throw this.handleError(error, 'Failed to set resolution');
    }
  }

  public static async setRotation(monitor: string, rotation: Rotation): Promise<void> {
    try {
      await this.execAsync(`xrandr --output ${monitor} --rotate ${this.getRotationString(rotation)}`);
    } catch (error) {
      throw this.handleError(error, 'Failed to set rotation');
    }
  }

  public static async setPrimary(monitor: string): Promise<void> {
    try {
      await this.execAsync(`xrandr --output ${monitor} --primary`);
    } catch (error) {
      throw this.handleError(error, 'Failed to set primary monitor');
    }
  }

  public static async turnOff(monitor: string): Promise<void> {
    try {
      await this.execAsync(`xrandr --output ${monitor} --off`);
    } catch (error) {
      throw this.handleError(error, 'Failed to turn off monitor');
    }
  }

  public static async turnOn(monitor: string): Promise<void> {
    try {
      await this.execAsync(`xrandr --output ${monitor} --auto`);
    } catch (error) {
      throw this.handleError(error, 'Failed to turn on monitor');
    }
  }

  private static async getMaxBrightness(): Promise<number> {
    try {
      const { stdout } = await this.execAsync(`cat ${this.MAX_BRIGHTNESS_FILE}`);
      return parseInt(stdout.trim());
    } catch (error) {
      throw this.handleError(error, 'Failed to get max brightness');
    }
  }

  private static parseXrandrOutput(output: string): MonitorInfo[] {
    const monitors: MonitorInfo[] = [];
    const lines = output.split('\n');
    let currentMonitor: Partial<MonitorInfo> = {};

    for (const line of lines) {
      const monitorMatch = line.match(/^(\S+) connected/);
      if (monitorMatch) {
        if (currentMonitor.name) {
          monitors.push(currentMonitor as MonitorInfo);
        }
        currentMonitor = {
          name: monitorMatch[1],
          connected: true,
          primary: line.includes('primary'),
          rotation: this.parseRotation(line)
        };
        continue;
      }

      const resolutionMatch = line.match(/\s+(\d+x\d+)\s+[\d.]+\*/);
      if (resolutionMatch && currentMonitor.name) {
        currentMonitor.resolution = resolutionMatch[1];
        const rateMatch = line.match(/(\d+\.\d+)\*/);
        currentMonitor.currentRate = rateMatch ? parseFloat(rateMatch[1]) : 60;
      }
    }

    if (currentMonitor.name) {
      monitors.push(currentMonitor as MonitorInfo);
    }

    return monitors;
  }

  private static parseRotation(line: string): number {
    if (line.includes('left')) return Rotation.LEFT;
    if (line.includes('right')) return Rotation.RIGHT;
    if (line.includes('inverted')) return Rotation.INVERTED;
    return Rotation.NORMAL;
  }

  private static getRotationString(rotation: Rotation): string {
    switch (rotation) {
      case Rotation.NORMAL: return 'normal';
      case Rotation.RIGHT: return 'right';
      case Rotation.INVERTED: return 'inverted';
      case Rotation.LEFT: return 'left';
    }
  }

  private static handleError(error: any, message: string): Error {
    return new Error(`${message}: ${error.message}`);
  }
}