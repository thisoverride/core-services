"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitorControl = exports.Rotation = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
var Rotation;
(function (Rotation) {
    Rotation[Rotation["NORMAL"] = 0] = "NORMAL";
    Rotation[Rotation["RIGHT"] = 90] = "RIGHT";
    Rotation[Rotation["INVERTED"] = 180] = "INVERTED";
    Rotation[Rotation["LEFT"] = 270] = "LEFT";
})(Rotation || (exports.Rotation = Rotation = {}));
class MonitorControl {
    static getMonitors() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { stdout } = yield this.execAsync('xrandr --query');
                return this.parseXrandrOutput(stdout);
            }
            catch (error) {
                throw this.handleError(error, 'Failed to get monitors');
            }
        });
    }
    static setBrightness(monitor, level) {
        return __awaiter(this, void 0, void 0, function* () {
            if (level < 0 || level > 100) {
                throw new Error('Brightness must be between 0 and 100');
            }
            try {
                const maxBrightness = yield this.getMaxBrightness();
                const value = Math.round((level / 100) * maxBrightness);
                yield this.execAsync(`sudo tee ${this.BRIGHTNESS_FILE} <<< "${value}"`);
            }
            catch (error) {
                throw this.handleError(error, 'Failed to set brightness');
            }
        });
    }
    static setResolution(monitor, width, height, rate) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let command = `xrandr --output ${monitor} --mode ${width}x${height}`;
                if (rate) {
                    command += ` --rate ${rate}`;
                }
                yield this.execAsync(command);
            }
            catch (error) {
                throw this.handleError(error, 'Failed to set resolution');
            }
        });
    }
    static setRotation(monitor, rotation) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.execAsync(`xrandr --output ${monitor} --rotate ${this.getRotationString(rotation)}`);
            }
            catch (error) {
                throw this.handleError(error, 'Failed to set rotation');
            }
        });
    }
    static setPrimary(monitor) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.execAsync(`xrandr --output ${monitor} --primary`);
            }
            catch (error) {
                throw this.handleError(error, 'Failed to set primary monitor');
            }
        });
    }
    static turnOff(monitor) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.execAsync(`xrandr --output ${monitor} --off`);
            }
            catch (error) {
                throw this.handleError(error, 'Failed to turn off monitor');
            }
        });
    }
    static turnOn(monitor) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.execAsync(`xrandr --output ${monitor} --auto`);
            }
            catch (error) {
                throw this.handleError(error, 'Failed to turn on monitor');
            }
        });
    }
    static getMaxBrightness() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { stdout } = yield this.execAsync(`cat ${this.MAX_BRIGHTNESS_FILE}`);
                return parseInt(stdout.trim());
            }
            catch (error) {
                throw this.handleError(error, 'Failed to get max brightness');
            }
        });
    }
    static parseXrandrOutput(output) {
        const monitors = [];
        const lines = output.split('\n');
        let currentMonitor = {};
        for (const line of lines) {
            const monitorMatch = line.match(/^(\S+) connected/);
            if (monitorMatch) {
                if (currentMonitor.name) {
                    monitors.push(currentMonitor);
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
            monitors.push(currentMonitor);
        }
        return monitors;
    }
    static parseRotation(line) {
        if (line.includes('left'))
            return Rotation.LEFT;
        if (line.includes('right'))
            return Rotation.RIGHT;
        if (line.includes('inverted'))
            return Rotation.INVERTED;
        return Rotation.NORMAL;
    }
    static getRotationString(rotation) {
        switch (rotation) {
            case Rotation.NORMAL: return 'normal';
            case Rotation.RIGHT: return 'right';
            case Rotation.INVERTED: return 'inverted';
            case Rotation.LEFT: return 'left';
        }
    }
    static handleError(error, message) {
        return new Error(`${message}: ${error.message}`);
    }
}
exports.MonitorControl = MonitorControl;
MonitorControl.execAsync = (0, util_1.promisify)(child_process_1.exec);
MonitorControl.BRIGHTNESS_FILE = '/sys/class/backlight/intel_backlight/brightness';
MonitorControl.MAX_BRIGHTNESS_FILE = '/sys/class/backlight/intel_backlight/max_brightness';
