"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const users_controller_1 = require("../../api/v1/users.controller");
const router = (0, express_1.Router)();
router.post('/register', users_controller_1.registerUser);
exports.default = router;
