"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const translate_routes_1 = __importDefault(require("./translate.routes"));
const user_routes_1 = __importDefault(require("./user.routes"));
const speech_routes_1 = __importDefault(require("./speech.routes"));
const speech_demo_routes_1 = __importDefault(require("./speech-demo.routes"));
const router = (0, express_1.Router)();
router.use('/translate', translate_routes_1.default);
router.use('/users', user_routes_1.default);
router.use('/speech', speech_routes_1.default);
router.use('/speech-demo', speech_demo_routes_1.default);
exports.default = router;
