"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const SystemXctrl_1 = __importDefault(require("./SystemXctrl"));
SystemXctrl_1.default.getStatus()
    .then((res) => console.log(res))
    .catch((e) => console.log(e));
