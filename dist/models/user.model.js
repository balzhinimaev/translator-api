"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const crypto_1 = require("crypto");
const UserSchema = new mongoose_1.Schema({
    telegramUserId: { type: Number, required: true, unique: true },
    apiToken: { type: String, required: true, unique: true, default: () => (0, crypto_1.randomUUID)() },
    balanceTokens: { type: Number, default: 0 },
    plan: {
        planId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Plan', required: true },
        name: { type: String, required: true }
    }
}, { timestamps: true });
exports.User = mongoose_1.models.User || (0, mongoose_1.model)('User', UserSchema);
