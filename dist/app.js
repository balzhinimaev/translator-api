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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const ws_1 = require("ws");
const llm_service_1 = require("./services/llm.service");
const speech_service_1 = require("./services/speech.service");
const translate_controller_1 = require("./api/v1/translate.controller");
const speech_controller_1 = require("./api/v1/speech.controller");
const mongoose_1 = __importDefault(require("./lib/mongoose"));
const v1_1 = __importDefault(require("./routes/v1"));
// Новые импорты для ручной обработки WebSocket
const url_1 = require("url");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = require("./models/user.model");
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Настройка CORS для разрешения запросов с локальных файлов и разработки
// app.use(cors({
//   origin: 'https://anoname.xyz', // Явно разрешаем домен вашего фронтенда
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
// }));
// Для парсинга JSON в body (если понадобится для других роутов)
app.use(express_1.default.json());
// API routes
app.use('/v1', v1_1.default);
// Пример обычного REST-эндпоинта
app.get('/', (req, res) => {
    res.send('API is running');
});
const server = http_1.default.createServer(app);
// WebSocket сервер для перевода текста (без прямого подключения к http.Server)
const wss = new ws_1.WebSocketServer({
    noServer: true
});
// WebSocket сервер для обработки речи в реальном времени (без прямого подключения к http.Server)
const speechWss = new ws_1.WebSocketServer({
    noServer: true
});
// Храним состояние стриминговых сессий
const streamingSessions = new Map();
// Храним активные WebSocket соединения для управления
const activeConnections = new Set();
// Функция очистки неактивных сессий
const cleanupInactiveSessions = () => {
    const now = Date.now();
    const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 минут
    for (const [sessionId, session] of streamingSessions) {
        if (now - session.lastProcessTime > SESSION_TIMEOUT) {
            console.log(`[cleanup] Removing inactive session: ${sessionId}`);
            if (session.timeoutId) {
                clearTimeout(session.timeoutId);
            }
            streamingSessions.delete(sessionId);
        }
    }
};
// Запускаем очистку каждые 5 минут
setInterval(cleanupInactiveSessions, 5 * 60 * 1000);
wss.on('connection', (ws, req) => {
    activeConnections.add(ws);
    if (req.user) {
        console.log(`WebSocket connection established for user with Telegram ID: ${req.user.telegramUserId}`);
        ws.send(JSON.stringify({ type: 'info', message: `Welcome, user ${req.user.telegramUserId}!` }));
    }
    else {
        console.error('WebSocket connection established without user authentication.');
        ws.close(1008, 'Authentication failed');
        return;
    }
    ws.on('message', (message) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        let parsedMessage;
        try {
            parsedMessage = JSON.parse(message.toString());
        }
        catch (error) {
            ws.send(JSON.stringify({ type: 'error', error: 'Invalid JSON format' }));
            return;
        }
        const validationResult = translate_controller_1.WsRequestSchema.safeParse(parsedMessage);
        if (!validationResult.success) {
            ws.send(JSON.stringify({
                type: 'error',
                request_id: parsedMessage.request_id || 'unknown',
                error: 'Validation failed',
                details: validationResult.error.flatten().fieldErrors,
            }));
            return;
        }
        const { request_id, payload } = validationResult.data;
        try {
            const stream = (0, llm_service_1.streamTranslateText)(payload.text, payload.src_lang, payload.dst_lang);
            let fullTranslatedText = '';
            try {
                for (var _d = true, stream_1 = __asyncValues(stream), stream_1_1; stream_1_1 = yield stream_1.next(), _a = stream_1_1.done, !_a; _d = true) {
                    _c = stream_1_1.value;
                    _d = false;
                    const chunk = _c;
                    ws.send(JSON.stringify({
                        type: 'translate_chunk',
                        request_id,
                        payload: chunk,
                    }));
                    if (chunk.delta) {
                        fullTranslatedText += chunk.delta;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = stream_1.return)) yield _b.call(stream_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            ws.send(JSON.stringify({
                type: 'translate_done',
                request_id,
                payload: {
                    translated_text: fullTranslatedText,
                    usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
                },
            }));
        }
        catch (e) {
            ws.send(JSON.stringify({
                type: 'error',
                request_id,
                error: 'Internal processing error',
            }));
        }
    }));
    ws.on('close', () => {
        console.log('WebSocket connection closed');
        activeConnections.delete(ws);
    });
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        activeConnections.delete(ws);
    });
});
// Обработчик WebSocket для речи в реальном времени
speechWss.on('connection', (ws, req) => {
    activeConnections.add(ws);
    if (req.user) {
        console.log(`Speech WebSocket connection established for user with Telegram ID: ${req.user.telegramUserId}`);
        ws.send(JSON.stringify({
            type: 'info',
            message: `Speech translation service ready for user ${req.user.telegramUserId}!`
        }));
    }
    else {
        console.error('Speech WebSocket connection established without user authentication.');
        ws.close(1008, 'Authentication failed');
        return;
    }
    ws.on('message', (message) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, e_2, _b, _c;
        let parsedMessage;
        try {
            parsedMessage = JSON.parse(message.toString());
        }
        catch (error) {
            ws.send(JSON.stringify({
                type: 'error',
                error: 'Invalid JSON format',
                message: 'Please send valid JSON data'
            }));
            return;
        }
        // Проверяем, является ли это потоковым запросом
        const streamingValidation = speech_controller_1.StreamingSpeechWsRequestSchema.safeParse(parsedMessage);
        if (streamingValidation.success) {
            yield handleStreamingRequest(ws, streamingValidation.data);
            return;
        }
        // Обычная валидация для старого формата
        const validationResult = speech_controller_1.SpeechWsRequestSchema.safeParse(parsedMessage);
        if (!validationResult.success) {
            ws.send(JSON.stringify({
                type: 'error',
                request_id: parsedMessage.request_id || 'unknown',
                error: 'Validation failed',
                details: validationResult.error.flatten().fieldErrors,
            }));
            return;
        }
        // Обработка обычного (не стримингового) запроса
        const { request_id, payload } = validationResult.data;
        const { src_lang, dst_lang, audio_data, voice, speed } = payload;
        try {
            console.log(`[speechWss] Starting real-time speech translation: ${src_lang} -> ${dst_lang}`);
            // Уведомляем о начале обработки
            ws.send(JSON.stringify({
                type: 'processing_started',
                request_id,
                message: 'Processing audio...'
            }));
            // Шаг 1: Декодируем аудио из base64
            const audioBuffer = Buffer.from(audio_data, 'base64');
            // Шаг 2: Speech-to-Text
            ws.send(JSON.stringify({
                type: 'stt_started',
                request_id,
                message: 'Converting speech to text...'
            }));
            const sttResult = yield (0, speech_service_1.speechToText)(audioBuffer, src_lang);
            ws.send(JSON.stringify({
                type: 'stt_completed',
                request_id,
                payload: {
                    text: sttResult.text,
                    language: sttResult.language,
                    duration: sttResult.duration
                }
            }));
            console.log(`[speechWss] STT completed: "${sttResult.text}"`);
            // Шаг 3: Перевод текста (стриминг)
            ws.send(JSON.stringify({
                type: 'translation_started',
                request_id,
                message: 'Translating text...'
            }));
            let translatedText = '';
            const translateStream = (0, llm_service_1.streamTranslateText)(sttResult.text, src_lang, dst_lang);
            try {
                for (var _d = true, translateStream_1 = __asyncValues(translateStream), translateStream_1_1; translateStream_1_1 = yield translateStream_1.next(), _a = translateStream_1_1.done, !_a; _d = true) {
                    _c = translateStream_1_1.value;
                    _d = false;
                    const chunk = _c;
                    if (chunk.delta) {
                        translatedText += chunk.delta;
                        ws.send(JSON.stringify({
                            type: 'translation_chunk',
                            request_id,
                            payload: {
                                delta: chunk.delta,
                                accumulated_text: translatedText
                            }
                        }));
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = translateStream_1.return)) yield _b.call(translateStream_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            ws.send(JSON.stringify({
                type: 'translation_completed',
                request_id,
                payload: {
                    translated_text: translatedText
                }
            }));
            console.log(`[speechWss] Translation completed: "${translatedText}"`);
            // Шаг 4: Text-to-Speech
            ws.send(JSON.stringify({
                type: 'tts_started',
                request_id,
                message: 'Converting text to speech...'
            }));
            const audioOptions = {
                voice: voice || 'alloy',
                speed: speed || 1.0
            };
            const ttsBuffer = yield (0, speech_service_1.textToSpeech)(translatedText, audioOptions);
            ws.send(JSON.stringify({
                type: 'tts_completed',
                request_id,
                payload: {
                    audio_base64: ttsBuffer.toString('base64'),
                    audio_size: ttsBuffer.length
                }
            }));
            console.log(`[speechWss] TTS completed, audio size: ${ttsBuffer.length} bytes`);
            // Финальное сообщение
            ws.send(JSON.stringify({
                type: 'speech_translation_completed',
                request_id,
                payload: {
                    original_text: sttResult.text,
                    translated_text: translatedText,
                    audio_base64: ttsBuffer.toString('base64'),
                    detected_language: sttResult.language,
                    duration: sttResult.duration,
                    src_lang,
                    dst_lang,
                    voice: audioOptions.voice,
                    speed: audioOptions.speed
                }
            }));
        }
        catch (error) {
            console.error(`[speechWss] Error processing request ${request_id}:`, error);
            ws.send(JSON.stringify({
                type: 'error',
                request_id,
                error: 'Processing failed',
                message: error instanceof Error ? error.message : 'Unknown error'
            }));
        }
    }));
    // Очистка при отключении клиента
    ws.on('close', () => {
        console.log('Speech WebSocket connection closed');
        activeConnections.delete(ws);
        // Очищаем все сессии для этого пользователя
        if (req.user) {
            const userPrefix = `${req.user.telegramUserId}_`;
            for (const [sessionId, session] of streamingSessions) {
                if (sessionId.startsWith(userPrefix)) {
                    console.log(`Cleaning up session: ${sessionId}`);
                    if (session.timeoutId) {
                        clearTimeout(session.timeoutId);
                    }
                    streamingSessions.delete(sessionId);
                }
            }
        }
    });
    ws.on('error', (error) => {
        console.error('Speech WebSocket error:', error);
        activeConnections.delete(ws);
        // Очищаем сессии при ошибке
        if (req.user) {
            const userPrefix = `${req.user.telegramUserId}_`;
            for (const [sessionId] of streamingSessions) {
                if (sessionId.startsWith(userPrefix)) {
                    console.log(`Cleaning up session after error: ${sessionId}`);
                    streamingSessions.delete(sessionId);
                }
            }
        }
    });
    ws.on('error', (error) => {
        console.error('Speech WebSocket error:', error);
        activeConnections.delete(ws);
        // Очищаем сессии при ошибке
        if (req.user) {
            const userPrefix = `${req.user.telegramUserId}_`;
            for (const [sessionId] of streamingSessions) {
                if (sessionId.startsWith(userPrefix)) {
                    console.log(`Cleaning up session after error: ${sessionId}`);
                    streamingSessions.delete(sessionId);
                }
            }
        }
    });
    // Обработчик потокового запроса
    function handleStreamingRequest(ws, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { type, request_id, payload } = data;
            const sessionId = `${(_a = req.user) === null || _a === void 0 ? void 0 : _a.telegramUserId}_${request_id}`;
            try {
                switch (type) {
                    case 'start_streaming':
                        console.log(`[speechWss] Starting streaming session: ${sessionId}`);
                        // Очищаем существующую сессию если есть
                        const existingSession = streamingSessions.get(sessionId);
                        if (existingSession === null || existingSession === void 0 ? void 0 : existingSession.timeoutId) {
                            clearTimeout(existingSession.timeoutId);
                        }
                        const sessionData = {
                            audioChunks: [],
                            src_lang: payload.src_lang,
                            dst_lang: payload.dst_lang,
                            voice: payload.voice || 'alloy',
                            speed: payload.speed || 1.0,
                            lastProcessTime: Date.now(),
                            processedText: '',
                            translatedText: '',
                            unprocessedTranslation: '',
                            processingStartedNotified: false,
                            timeoutId: setTimeout(() => {
                                console.log(`[timeout] Auto-cleaning session: ${sessionId}`);
                                streamingSessions.delete(sessionId);
                            }, 30 * 60 * 1000) // 30 минут таймаут
                        };
                        streamingSessions.set(sessionId, sessionData);
                        ws.send(JSON.stringify({
                            type: 'streaming_started',
                            request_id,
                            message: 'Ready to receive audio chunks'
                        }));
                        break;
                    case 'audio_chunk':
                        const session = streamingSessions.get(sessionId);
                        if (!session) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                request_id,
                                error: 'Session not found. Call start_streaming first.'
                            }));
                            return;
                        }
                        if (payload.audio_chunk) {
                            // Добавляем чанк к буферу
                            const chunkBuffer = Buffer.from(payload.audio_chunk, 'base64');
                            session.audioChunks.push(chunkBuffer);
                            // Проверяем, нужно ли обработать накопленные чанки
                            const now = Date.now();
                            const timeSinceLastProcess = now - session.lastProcessTime;
                            // Обрабатываем если прошло достаточно времени И накопилось достаточно данных
                            if (timeSinceLastProcess > 5000 && (0, speech_service_1.hasEnoughAudioData)(session.audioChunks)) {
                                yield processAccumulatedChunks(ws, sessionId, request_id, false);
                            }
                            else if (session.audioChunks.length > 20) {
                                // Принудительная обработка если слишком много чанков
                                yield processAccumulatedChunks(ws, sessionId, request_id, false);
                            }
                        }
                        break;
                    case 'end_streaming':
                        yield processAccumulatedChunks(ws, sessionId, request_id, true);
                        // Очищаем таймаут и удаляем сессию
                        const endSession = streamingSessions.get(sessionId);
                        if (endSession === null || endSession === void 0 ? void 0 : endSession.timeoutId) {
                            clearTimeout(endSession.timeoutId);
                        }
                        streamingSessions.delete(sessionId);
                        ws.send(JSON.stringify({
                            type: 'streaming_ended',
                            request_id,
                            message: 'Streaming session completed'
                        }));
                        break;
                }
            }
            catch (error) {
                console.error(`[speechWss] Streaming error for ${sessionId}:`, error);
                ws.send(JSON.stringify({
                    type: 'error',
                    request_id,
                    error: 'Streaming processing failed',
                    message: error instanceof Error ? error.message : 'Unknown error'
                }));
            }
        });
    }
    const MIN_AUDIO_CHUNK_SIZE_BYTES = 50000; // Минимальный размер чанка для обработки
    // Обработка накопленных аудио-чанков
    function processAccumulatedChunks(ws, sessionId, request_id, isFinal) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, e_3, _b, _c;
            const session = streamingSessions.get(sessionId);
            if (!session || session.audioChunks.length === 0)
                return;
            const totalSize = session.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
            console.log(`[speechWss] Processing ${session.audioChunks.length} chunks (total size: ${totalSize} bytes) for session ${sessionId}, final: ${isFinal}`);
            // Пропускаем обработку, если данных недостаточно (кроме финального запроса)
            if (totalSize < MIN_AUDIO_CHUNK_SIZE_BYTES && !isFinal) {
                console.log(`[speechWss] Buffer too small (${totalSize}B < ${MIN_AUDIO_CHUNK_SIZE_BYTES}B), skipping processing.`);
                return;
            }
            try {
                if (!session.processingStartedNotified) {
                    ws.send(JSON.stringify({ type: 'chunk_processing_started', request_id, message: 'Processing audio chunk...' }));
                    session.processingStartedNotified = true;
                }
                const combinedBuffer = Buffer.concat(session.audioChunks);
                session.lastProcessTime = Date.now();
                // НЕ ОЧИЩАЕМ session.audioChunks, чтобы сохранить целостность аудиопотока
                const sttResult = yield (0, speech_service_1.speechToTextStreaming)(combinedBuffer, session.src_lang);
                if (sttResult && sttResult.text.trim()) {
                    const fullTranscribedText = sttResult.text.trim();
                    // Если появилась новая распознанная часть текста
                    if (fullTranscribedText.length > session.processedText.length) {
                        const newText = fullTranscribedText.substring(session.processedText.length).trim();
                        if (newText) {
                            session.processedText = fullTranscribedText;
                            ws.send(JSON.stringify({
                                type: 'partial_stt_result',
                                request_id,
                                payload: {
                                    partial_text: newText,
                                    accumulated_text: session.processedText,
                                    is_final: isFinal
                                }
                            }));
                            // Переводим только новый кусок текста
                            let translatedChunk = '';
                            const translateStream = (0, llm_service_1.streamTranslateText)(newText, session.src_lang, session.dst_lang);
                            try {
                                for (var _d = true, translateStream_2 = __asyncValues(translateStream), translateStream_2_1; translateStream_2_1 = yield translateStream_2.next(), _a = translateStream_2_1.done, !_a; _d = true) {
                                    _c = translateStream_2_1.value;
                                    _d = false;
                                    const chunk = _c;
                                    if (chunk.delta) {
                                        translatedChunk += chunk.delta;
                                        // Отправляем чанки перевода по мере их поступления
                                        ws.send(JSON.stringify({
                                            type: 'partial_translation_chunk',
                                            request_id,
                                            payload: {
                                                delta: chunk.delta,
                                                accumulated_translation: session.translatedText + (session.translatedText ? ' ' : '') + translatedChunk
                                            }
                                        }));
                                    }
                                }
                            }
                            catch (e_3_1) { e_3 = { error: e_3_1 }; }
                            finally {
                                try {
                                    if (!_d && !_a && (_b = translateStream_2.return)) yield _b.call(translateStream_2);
                                }
                                finally { if (e_3) throw e_3.error; }
                            }
                            // Добавляем полностью переведенный чанк к общему переводу
                            const newTranslatedChunk = translatedChunk.trim();
                            if (newTranslatedChunk) {
                                session.translatedText += (session.translatedText ? ' ' : '') + newTranslatedChunk;
                                session.unprocessedTranslation += (session.unprocessedTranslation ? ' ' : '') + newTranslatedChunk;
                            }
                            // Обработка и отправка аудио по предложениям
                            yield processAndSendAudioBySentences(ws, session, request_id);
                        }
                    }
                }
                // Если это финальная обработка, озвучиваем остатки и отправляем финальное сообщение
                if (isFinal) {
                    if (session.unprocessedTranslation.trim()) {
                        yield processAndSendAudioBySentences(ws, session, request_id, true);
                    }
                    ws.send(JSON.stringify({
                        type: 'final_stream_ended',
                        request_id,
                        payload: {
                            original_text: session.processedText,
                            translated_text: session.translatedText,
                        }
                    }));
                }
            }
            catch (error) {
                console.error(`[speechWss] Error processing chunks for ${sessionId}:`, error);
                ws.send(JSON.stringify({
                    type: 'chunk_processing_error',
                    request_id,
                    error: 'Failed to process audio chunk',
                    message: error instanceof Error ? error.message : 'Unknown error'
                }));
            }
        });
    }
    function processAndSendAudioBySentences(ws_2, session_1, request_id_1) {
        return __awaiter(this, arguments, void 0, function* (ws, session, request_id, forceProcess = false) {
            const sentences = session.unprocessedTranslation.split(/(?<=[.?!])\s+/);
            // Если не форсируем и последнее "предложение" не закончено, оставляем его в буфере
            if (!forceProcess && sentences.length > 1) {
                session.unprocessedTranslation = sentences.pop() || '';
            }
            else {
                session.unprocessedTranslation = '';
            }
            for (const sentence of sentences) {
                if (sentence.trim()) {
                    const audioOptions = { voice: session.voice || 'alloy', speed: session.speed || 1.0 };
                    const ttsBuffer = yield (0, speech_service_1.textToSpeech)(sentence.trim(), audioOptions);
                    ws.send(JSON.stringify({
                        type: 'translated_audio_chunk',
                        request_id,
                        payload: {
                            audio_base64: ttsBuffer.toString('base64'),
                        }
                    }));
                    console.log(`[speechWss] Sent 'translated_audio_chunk' to frontend. Size: ${ttsBuffer.length} bytes.`);
                }
            }
        });
    }
});
// Ручная обработка 'upgrade' запросов для полного контроля
server.on('upgrade', (request, socket, head) => __awaiter(void 0, void 0, void 0, function* () {
    if (!request.url) {
        socket.destroy();
        return;
    }
    const { pathname, searchParams } = new url_1.URL(request.url, `http://${request.headers.host}`);
    const token = searchParams.get('token');
    // --- Аутентификация ---
    if (!token) {
        console.log('[wsUpgrade] FAILED: Token not present.');
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = yield user_model_1.User.findById(decoded.id);
        if (!user) {
            console.log(`[wsUpgrade] FAILED: User not found for ID: ${decoded.id}`);
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }
        // Прикрепляем пользователя к запросу для 'connection' обработчика
        request.user = user;
        console.log(`[wsUpgrade] SUCCESS: User ${user._id} authenticated for path ${pathname}.`);
    }
    catch (error) {
        console.log('[wsUpgrade] FAILED: Token verification error.', error);
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
    }
    // --- Конец Аутентификации ---
    // --- Маршрутизация ---
    if (pathname === '/v1/stream/translate') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    }
    else if (pathname === '/v1/stream/speech') {
        speechWss.handleUpgrade(request, socket, head, (ws) => {
            speechWss.emit('connection', ws, request);
        });
    }
    else {
        // Если нет обработчика для этого пути, закрываем сокет
        console.log(`[wsUpgrade] FAILED: No handler for path ${pathname}`);
        socket.destroy();
    }
}));
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, mongoose_1.default)();
        server.listen(port, () => {
            console.log(`Server listening on port ${port}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
});
// Функция очистки временных файлов
const cleanupTempFiles = () => {
    try {
        const fs = require('fs');
        const path = require('path');
        const tempDir = path.join(__dirname, '../temp');
        if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            files.forEach((file) => {
                const filePath = path.join(tempDir, file);
                try {
                    fs.unlinkSync(filePath);
                    console.log(`Removed temp file: ${file}`);
                }
                catch (err) {
                    console.error(`Failed to remove temp file ${file}:`, err);
                }
            });
        }
    }
    catch (error) {
        console.error('Error cleaning temp files:', error);
    }
};
// Graceful shutdown
const shutdown = (signal) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    // Закрываем все активные WebSocket соединения
    console.log(`Closing ${activeConnections.size} active WebSocket connections...`);
    activeConnections.forEach((ws) => {
        try {
            ws.close(1001, 'Server shutting down');
        }
        catch (error) {
            console.error('Error closing WebSocket:', error);
        }
    });
    // Очищаем все активные сессии
    console.log(`Cleaning up ${streamingSessions.size} active streaming sessions...`);
    streamingSessions.clear();
    // Очищаем временные файлы
    console.log('Cleaning up temporary files...');
    cleanupTempFiles();
    // Закрываем сервер
    server.close((err) => {
        if (err) {
            console.error('Error during server shutdown:', err);
            process.exit(1);
        }
        console.log('Server closed successfully');
        process.exit(0);
    });
    // Форсированное завершение через 10 секунд
    setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
});
// Обработчики сигналов завершения
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
// Обработка uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    shutdown('UNCAUGHT_EXCEPTION');
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('UNHANDLED_REJECTION');
});
startServer();
