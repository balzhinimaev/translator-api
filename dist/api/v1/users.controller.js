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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = require("../../models/user.model");
const plan_model_1 = require("../../models/plan.model");
const telegram_1 = require("../../utils/telegram");
const registerUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("📝 Register request body:", JSON.stringify(req.body, null, 2));
        let { initData } = req.body;
        if (!initData) {
            res.status(400).json({ error: "initData is required" });
            return;
        }
        // Если initData пришел как объект с вложенной строкой, извлекаем её
        if (typeof initData === 'object' && initData.initData) {
            initData = initData.initData;
        }
        // Если initData - это JSON строка, парсим её
        if (typeof initData === 'string' && initData.startsWith('{')) {
            try {
                const parsed = JSON.parse(initData);
                if (parsed.initData) {
                    initData = parsed.initData;
                }
            }
            catch (e) {
                console.log("initData is not JSON, using as is");
            }
        }
        console.log("🔑 Final initData for validation:", initData);
        const botToken = process.env.BOT_TOKEN;
        if (!botToken) {
            console.error("BOT_TOKEN is not configured");
            res.status(500).json({ error: "Server configuration error" });
            return;
        }
        // Проверяем актуальность auth_date
        if (!(0, telegram_1.isAuthDateValid)(initData)) {
            console.log("⏰ Auth date is too old or invalid");
            res.status(403).json({ error: "Auth date is expired or invalid" });
            return;
        }
        // Валидация initData
        const isValid = (0, telegram_1.validateInitData)(initData, botToken);
        if (!isValid) {
            console.log("❌ initData validation failed");
            res.status(403).json({ error: "Invalid initData: hash mismatch" });
            return;
        }
        console.log("✅ initData validation passed");
        // Извлечение данных пользователя
        const telegramUser = (0, telegram_1.parseUser)(initData);
        if (!telegramUser) {
            res.status(400).json({ error: "User data not found in initData" });
            return;
        }
        console.log("👤 Telegram user:", telegramUser);
        const telegramUserId = telegramUser.id;
        // Поиск или создание пользователя в БД
        let user = yield user_model_1.User.findOne({ telegramUserId });
        if (!user) {
            const freePlan = yield plan_model_1.Plan.findOne({ name: "Free" });
            if (!freePlan) {
                res.status(500).json({ error: "Default plan not found" });
                return;
            }
            user = yield user_model_1.User.create({
                telegramUserId: telegramUserId,
                plan: {
                    planId: freePlan._id,
                    name: freePlan.name,
                },
                balanceTokens: 10000,
            });
            console.log("🆕 Created new user:", user._id);
        }
        else {
            console.log("👋 Found existing user:", user._id);
        }
        // Создаем JWT токен для WebSocket аутентификации
        const jwtToken = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        // Возвращаем API токен и JWT токен
        res.json({
            message: user.isNew ? "User registered successfully" : "User logged in successfully",
            userId: user._id,
            apiToken: user.apiToken,
            wsToken: jwtToken,
            balanceTokens: user.balanceTokens,
            plan: user.plan,
        });
    }
    catch (error) {
        console.error("❌ Error registering user:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.registerUser = registerUser;
