"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const translate_controller_1 = require("../../api/v1/translate.controller");
const router = (0, express_1.Router)();
router.post('/', translate_controller_1.handleTranslate);
exports.default = router;
