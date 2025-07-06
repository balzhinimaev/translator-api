"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateInitData = validateInitData;
exports.isAuthDateValid = isAuthDateValid;
exports.parseUser = parseUser;
// src/utils/telegram.ts
const crypto_1 = require("crypto");
/**
 * Валидирует initData, полученные от Telegram Mini App.
 */
function validateInitData(initData, botToken) {
    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get("hash");
        console.log("🔍 Debugging initData validation:");
        console.log("Original initData:", initData);
        console.log("Extracted hash:", hash);
        if (!hash) {
            console.log("❌ No hash found in initData");
            return false;
        }
        // Удаляем hash из параметров
        urlParams.delete("hash");
        // Сортируем ключи в алфавитном порядке
        const keys = Array.from(urlParams.keys()).sort();
        console.log("Sorted keys:", keys);
        // Формируем строку data-check-string
        const dataCheckString = keys
            .map((key) => `${key}=${urlParams.get(key)}`)
            .join("\n");
        console.log("Data check string:", dataCheckString);
        // Создаем секретный ключ из токена бота
        const secretKey = (0, crypto_1.createHmac)("sha256", "WebAppData")
            .update(botToken)
            .digest();
        // Генерируем хэш из data-check-string
        const calculatedHash = (0, crypto_1.createHmac)("sha256", secretKey)
            .update(dataCheckString)
            .digest("hex");
        console.log("Expected hash:", hash);
        console.log("Calculated hash:", calculatedHash);
        console.log("Hashes match:", calculatedHash === hash);
        return calculatedHash === hash;
    }
    catch (error) {
        console.error("Error during initData validation:", error);
        return false;
    }
}
/**
 * Проверяет актуальность auth_date (не старше 24 часов)
 */
function isAuthDateValid(initData) {
    try {
        const urlParams = new URLSearchParams(initData);
        const authDate = urlParams.get("auth_date");
        if (!authDate) {
            return false;
        }
        const authTimestamp = parseInt(authDate, 10);
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const maxAge = 24 * 60 * 60; // 24 часа в секундах
        return (currentTimestamp - authTimestamp) <= maxAge;
    }
    catch (error) {
        console.error("Error checking auth_date:", error);
        return false;
    }
}
/**
 * Парсит объект пользователя из строки initData.
 */
function parseUser(initData) {
    try {
        const urlParams = new URLSearchParams(initData);
        const userString = urlParams.get("user");
        if (userString) {
            return JSON.parse(decodeURIComponent(userString));
        }
        return null;
    }
    catch (error) {
        console.error("Error parsing user from initData:", error);
        return null;
    }
}
