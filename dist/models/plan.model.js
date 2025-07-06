"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Plan = void 0;
// src/models/plan.model.ts
const mongoose_1 = require("mongoose");
const PlanSchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true },
    priceMonthly: { type: Number, required: true },
    rateLimitRequestsPerMinute: { type: Number, required: true },
    monthlyTokenLimit: { type: Number, required: true },
    maxParallelRequests: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    description: { type: String, required: false }, // Сделали необязательным
}, { timestamps: true });
exports.Plan = mongoose_1.models.Plan || (0, mongoose_1.model)("Plan", PlanSchema);
