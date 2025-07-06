"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        // TODO: Добавить реальную валидацию токена
        if (token === "SECRET_TOKEN") {
            return next();
        }
    }
    res.status(401).send();
};
exports.authMiddleware = authMiddleware;
