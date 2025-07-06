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
exports.verifyWsClient = void 0;
const url_1 = require("url");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = require("../models/user.model");
const verifyWsClient = (
// Указываем, что req будет иметь наш расширенный тип
info, done) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`[wsAuth] New connection attempt. Origin: ${info.origin}, URL: ${info.req.url}`);
    if (!info.req.url) {
        console.error('[wsAuth] FAILED: URL not present.');
        return done(false, 401, 'Unauthorized: URL not present');
    }
    // Получаем токен из query параметра ?token=...
    const url = new url_1.URL(info.req.url, `http://${info.req.headers.host}`);
    const token = url.searchParams.get('token');
    console.log(`[wsAuth] Token found: ${token ? 'Yes, length ' + token.length : 'No'}`);
    if (!token) {
        console.error('[wsAuth] FAILED: Token not present.');
        return done(false, 401, 'Unauthorized: Token not present');
    }
    try {
        // Проверяем JWT
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        console.log(`[wsAuth] Token decoded for user ID: ${decoded.id}`);
        // Ищем пользователя в базе данных
        const user = yield user_model_1.User.findById(decoded.id);
        if (!user) {
            console.error(`[wsAuth] FAILED: User not found for ID: ${decoded.id}`);
            return done(false, 401, 'Unauthorized: User not found');
        }
        // Прикрепляем пользователя к объекту запроса для дальнейшего использования
        info.req.user = user;
        console.log(`[wsAuth] SUCCESS: User ${user._id} authenticated.`);
        // Успех! Разрешаем соединение.
        return done(true);
    }
    catch (error) {
        console.error('[wsAuth] FAILED: Token verification error.', error);
        // Если jwt.verify выбросит ошибку (невалидный токен, истек срок и т.д.)
        return done(false, 401, 'Unauthorized: Invalid token');
    }
});
exports.verifyWsClient = verifyWsClient;
