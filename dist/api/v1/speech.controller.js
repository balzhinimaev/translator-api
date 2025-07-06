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
exports.uploadAudio = exports.handleGetSupportedLanguages = exports.handleTextToSpeech = exports.handleSpeechToText = exports.handleSpeechTranslate = exports.StreamingSpeechWsRequestSchema = exports.SpeechWsRequestSchema = void 0;
const zod_1 = require("zod");
const multer_1 = __importDefault(require("multer"));
const speech_service_1 = require("../../services/speech.service");
const llm_service_1 = require("../../services/llm.service");
// Схемы валидации
const SpeechTranslateSchema = zod_1.z.object({
    src_lang: zod_1.z.string().length(2, 'Source language must be a 2-character code'),
    dst_lang: zod_1.z.string().length(2, 'Destination language must be a 2-character code'),
    voice: zod_1.z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).optional(),
    speed: zod_1.z.coerce.number().min(0.25).max(4.0).optional(),
});
const TextToSpeechSchema = zod_1.z.object({
    text: zod_1.z.string().min(1).max(4000, 'Text must be between 1 and 4000 characters'),
    voice: zod_1.z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).optional(),
    speed: zod_1.z.number().min(0.25).max(4.0).optional(),
});
// WebSocket схемы для real-time обработки
exports.SpeechWsRequestSchema = zod_1.z.object({
    type: zod_1.z.literal('speech_translate_request'),
    request_id: zod_1.z.string().uuid('request_id must be a valid UUID'),
    payload: zod_1.z.object({
        src_lang: zod_1.z.string().length(2),
        dst_lang: zod_1.z.string().length(2),
        audio_data: zod_1.z.string(), // base64 encoded audio
        voice: zod_1.z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).optional(),
        speed: zod_1.z.number().min(0.25).max(4.0).optional(),
    }),
});
// Новая схема для потоковой передачи аудио-чанков
exports.StreamingSpeechWsRequestSchema = zod_1.z.object({
    type: zod_1.z.enum(['start_streaming', 'audio_chunk', 'end_streaming']),
    request_id: zod_1.z.string().uuid('request_id must be a valid UUID'),
    payload: zod_1.z.object({
        src_lang: zod_1.z.string().length(2).optional(),
        dst_lang: zod_1.z.string().length(2).optional(),
        audio_chunk: zod_1.z.string().optional(), // base64 encoded audio chunk
        voice: zod_1.z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).optional(),
        speed: zod_1.z.number().min(0.25).max(4.0).optional(),
        is_final: zod_1.z.boolean().optional(), // флаг завершения потока
    }),
});
// Конфигурация multer для загрузки аудио файлов
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB максимум
    },
    fileFilter: (req, file, cb) => {
        // Проверяем MIME типы аудио файлов
        const allowedMimes = [
            'audio/wav',
            'audio/mpeg',
            'audio/mp3',
            'audio/mp4',
            'audio/m4a',
            'audio/webm',
            'audio/ogg',
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only audio files are allowed.'));
        }
    },
});
/**
 * Обработка полного пайплайна: Speech -> Text -> Translation -> Speech
 */
const handleSpeechTranslate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c;
    try {
        // Валидация параметров
        const validationResult = SpeechTranslateSchema.safeParse(req.body);
        if (!validationResult.success) {
            res.status(400).json({
                error: {
                    code: 'INVALID_PARAMS',
                    message: 'Invalid parameters',
                    details: validationResult.error.flatten().fieldErrors,
                },
            });
            return;
        }
        const { src_lang, dst_lang, voice, speed } = validationResult.data;
        // Проверяем наличие аудио файла
        if (!req.file) {
            res.status(400).json({
                error: {
                    code: 'NO_AUDIO_FILE',
                    message: 'Audio file is required',
                },
            });
            return;
        }
        const startTime = Date.now();
        console.log(`[speech.controller] Starting speech translation pipeline: ${src_lang} -> ${dst_lang}`);
        // Шаг 1: Speech-to-Text
        const sttResult = yield (0, speech_service_1.speechToText)(req.file.buffer, src_lang);
        console.log(`[speech.controller] STT completed: "${sttResult.text}"`);
        // Шаг 2: Перевод текста
        let translatedText = '';
        const translateStream = (0, llm_service_1.streamTranslateText)(sttResult.text, src_lang, dst_lang);
        try {
            for (var _d = true, translateStream_1 = __asyncValues(translateStream), translateStream_1_1; translateStream_1_1 = yield translateStream_1.next(), _a = translateStream_1_1.done, !_a; _d = true) {
                _c = translateStream_1_1.value;
                _d = false;
                const chunk = _c;
                if (chunk.delta) {
                    translatedText += chunk.delta;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = translateStream_1.return)) yield _b.call(translateStream_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        console.log(`[speech.controller] Translation completed: "${translatedText}"`);
        // Шаг 3: Text-to-Speech
        const ttsOptions = {
            voice: voice || 'alloy',
            speed: speed || 1.0,
            format: 'mp3',
        };
        const audioBuffer = yield (0, speech_service_1.textToSpeech)(translatedText, ttsOptions);
        console.log(`[speech.controller] TTS completed, audio size: ${audioBuffer.length} bytes`);
        const totalLatency = Date.now() - startTime;
        console.log(`[speech.controller] Full pipeline latency: ${totalLatency}ms`);
        // Отправляем аудио напрямую, а метаданные в заголовках
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', 'attachment; filename="translated_speech.mp3"');
        res.setHeader('Content-Length', audioBuffer.length);
        res.setHeader('X-Original-Text', encodeURIComponent(sttResult.text));
        res.setHeader('X-Translated-Text', encodeURIComponent(translatedText));
        res.setHeader('X-Detected-Language', sttResult.language || '');
        res.setHeader('X-Latency-Ms', totalLatency.toString());
        res.send(audioBuffer);
    }
    catch (error) {
        console.error('[speech.controller] Error in speech translation:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to process speech translation',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
        });
    }
});
exports.handleSpeechTranslate = handleSpeechTranslate;
/**
 * Только Speech-to-Text
 */
const handleSpeechToText = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { language } = req.query;
        if (!req.file) {
            res.status(400).json({
                error: {
                    code: 'NO_AUDIO_FILE',
                    message: 'Audio file is required',
                },
            });
            return;
        }
        const startTime = Date.now();
        const result = yield (0, speech_service_1.speechToText)(req.file.buffer, language);
        const latency = Date.now() - startTime;
        res.status(200).json({
            success: true,
            data: {
                text: result.text,
                language: result.language,
                duration: result.duration,
                latency_ms: latency,
            },
        });
    }
    catch (error) {
        console.error('[speech.controller] Error in speech-to-text:', error);
        res.status(500).json({
            error: {
                code: 'STT_ERROR',
                message: 'Failed to convert speech to text',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
        });
    }
});
exports.handleSpeechToText = handleSpeechToText;
/**
 * Только Text-to-Speech
 */
const handleTextToSpeech = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const validationResult = TextToSpeechSchema.safeParse(req.body);
        if (!validationResult.success) {
            res.status(400).json({
                error: {
                    code: 'INVALID_PARAMS',
                    message: 'Invalid parameters',
                    details: validationResult.error.flatten().fieldErrors,
                },
            });
            return;
        }
        const { text, voice, speed } = validationResult.data;
        const startTime = Date.now();
        const audioBuffer = yield (0, speech_service_1.textToSpeech)(text, { voice, speed, format: 'mp3' });
        const latency = Date.now() - startTime;
        console.log(`[speech.controller] TTS for "${text.substring(0, 30)}..." completed in ${latency}ms, audio size: ${audioBuffer.length} bytes`);
        // Отправляем аудио напрямую
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `attachment; filename="speech.mp3"`);
        res.setHeader('Content-Length', audioBuffer.length);
        res.send(audioBuffer);
    }
    catch (error) {
        console.error('[speech.controller] Error in text-to-speech:', error);
        res.status(500).json({
            error: {
                code: 'TTS_ERROR',
                message: 'Failed to convert text to speech',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
        });
    }
});
exports.handleTextToSpeech = handleTextToSpeech;
/**
 * Получение списка поддерживаемых языков
 */
const handleGetSupportedLanguages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const languages = (0, speech_service_1.getSupportedLanguages)();
        res.status(200).json({
            success: true,
            data: { languages },
        });
    }
    catch (error) {
        console.error('[speech.controller] Error getting supported languages:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get supported languages',
            },
        });
    }
});
exports.handleGetSupportedLanguages = handleGetSupportedLanguages;
// Экспортируем middleware для загрузки файлов
exports.uploadAudio = upload.single('audio');
