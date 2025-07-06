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
exports.disconnectDB = exports.getConnectionStatus = void 0;
// src/lib/mongoose.ts
const mongoose_1 = __importDefault(require("mongoose"));
// Настройки подключения в зависимости от окружения
const getConnectionOptions = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
        maxPoolSize: isProduction ? 10 : 5, // Максимальное количество соединений в пуле
        serverSelectionTimeoutMS: 10000, // Таймаут выбора сервера
        socketTimeoutMS: 45000, // Таймаут сокета
        family: 4, // Использовать IPv4
        retryWrites: true, // Включить повторные попытки записи
        w: 'majority', // Запись подтверждается большинством реплик
    };
};
const connectDB = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Получаем URI из переменных окружения
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/translator_api';
        // Настройки Mongoose
        mongoose_1.default.set('strictQuery', false);
        // Подключение с опциями
        const connectionOptions = getConnectionOptions();
        console.log(`🔗 Connecting to MongoDB: ${mongoURI.replace(/\/\/.*:.*@/, '//***:***@')}`);
        yield mongoose_1.default.connect(mongoURI, connectionOptions);
        console.log('✅ MongoDB connected successfully');
        console.log(`📊 Database: ${(_a = mongoose_1.default.connection.db) === null || _a === void 0 ? void 0 : _a.databaseName}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        // Обработчики событий подключения
        mongoose_1.default.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB disconnected');
        });
        mongoose_1.default.connection.on('reconnected', () => {
            console.log('🔄 MongoDB reconnected');
        });
        // Graceful shutdown
        process.on('SIGINT', () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                yield mongoose_1.default.connection.close();
                console.log('🔌 MongoDB connection closed through app termination');
                process.exit(0);
            }
            catch (error) {
                console.error('❌ Error during MongoDB disconnect:', error);
                process.exit(1);
            }
        }));
    }
    catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
        // В продакшене выходим, в разработке можем продолжить
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
        else {
            console.warn('⚠️ Continuing in development mode without database');
        }
    }
});
// Функция для проверки состояния подключения
const getConnectionStatus = () => {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    return {
        state: states[mongoose_1.default.connection.readyState] || 'unknown',
        host: mongoose_1.default.connection.host,
        port: mongoose_1.default.connection.port,
        name: mongoose_1.default.connection.name,
    };
};
exports.getConnectionStatus = getConnectionStatus;
// Функция для graceful disconnect
const disconnectDB = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield mongoose_1.default.connection.close();
        console.log('🔌 MongoDB disconnected gracefully');
    }
    catch (error) {
        console.error('❌ Error disconnecting from MongoDB:', error);
        throw error;
    }
});
exports.disconnectDB = disconnectDB;
exports.default = connectDB;
