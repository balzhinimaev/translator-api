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
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasEnoughAudioData = exports.speechToTextStreaming = exports.getSupportedLanguages = exports.streamTextToSpeech = exports.textToSpeech = exports.speechToText = void 0;
const openai_1 = __importDefault(require("openai"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
// Функция очистки старых временных файлов
const cleanupOldTempFiles = (maxAgeMinutes = 30) => {
    try {
        const tempDir = path_1.default.join(__dirname, '../../temp');
        if (!fs_1.default.existsSync(tempDir))
            return;
        const files = fs_1.default.readdirSync(tempDir);
        const now = Date.now();
        let cleanedCount = 0;
        files.forEach((file) => {
            const filePath = path_1.default.join(tempDir, file);
            try {
                const stats = fs_1.default.statSync(filePath);
                const ageMinutes = (now - stats.mtime.getTime()) / (1000 * 60);
                if (ageMinutes > maxAgeMinutes) {
                    fs_1.default.unlinkSync(filePath);
                    cleanedCount++;
                    console.log(`[speech.service] Cleaned old temp file: ${file} (age: ${ageMinutes.toFixed(1)} min)`);
                }
            }
            catch (err) {
                console.error(`[speech.service] Error processing temp file ${file}:`, err);
            }
        });
        if (cleanedCount > 0) {
            console.log(`[speech.service] Cleaned ${cleanedCount} old temporary files`);
        }
    }
    catch (error) {
        console.error('[speech.service] Error during temp files cleanup:', error);
    }
};
/**
 * Преобразование речи в текст используя OpenAI Whisper
 */
const speechToText = (audioBuffer, language) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Очищаем старые временные файлы перед созданием новых
        cleanupOldTempFiles();
        console.log('[speech.service] Starting speech-to-text conversion');
        // Создаем временный файл для аудио
        const tempFileName = `temp_audio_${Date.now()}.wav`;
        const tempFilePath = path_1.default.join(__dirname, '../../temp', tempFileName);
        // Убеждаемся что папка temp существует
        const tempDir = path_1.default.dirname(tempFilePath);
        if (!fs_1.default.existsSync(tempDir)) {
            fs_1.default.mkdirSync(tempDir, { recursive: true });
        }
        // Сохраняем аудио буфер во временный файл
        fs_1.default.writeFileSync(tempFilePath, audioBuffer);
        const transcription = yield openai.audio.transcriptions.create({
            file: fs_1.default.createReadStream(tempFilePath),
            model: 'whisper-1',
            language: language,
            response_format: 'verbose_json',
        });
        // Удаляем временный файл сразу после использования
        try {
            fs_1.default.unlinkSync(tempFilePath);
        }
        catch (err) {
            console.error('[speech.service] Failed to delete temp file:', err);
        }
        console.log('[speech.service] Speech-to-text completed:', transcription.text);
        return {
            text: transcription.text,
            language: transcription.language,
            duration: transcription.duration,
        };
    }
    catch (error) {
        console.error('[speech.service] Error in speech-to-text:', error);
        throw new Error('Failed to convert speech to text');
    }
});
exports.speechToText = speechToText;
/**
 * Преобразование текста в речь используя OpenAI TTS
 */
const textToSpeech = (text_1, ...args_1) => __awaiter(void 0, [text_1, ...args_1], void 0, function* (text, options = {}) {
    try {
        console.log('[speech.service] Starting text-to-speech conversion for:', text.substring(0, 50) + '...');
        const mp3 = yield openai.audio.speech.create({
            model: 'tts-1-hd', // Используем HD модель для лучшего качества
            voice: options.voice || 'alloy',
            input: text,
            speed: options.speed || 1.0,
            response_format: options.format || 'mp3',
        });
        // Конвертируем поток в буфер
        const buffer = Buffer.from(yield mp3.arrayBuffer());
        console.log('[speech.service] Text-to-speech completed, buffer size:', buffer.length);
        return buffer;
    }
    catch (error) {
        console.error('[speech.service] Error in text-to-speech:', error);
        throw new Error('Failed to convert text to speech');
    }
});
exports.textToSpeech = textToSpeech;
/**
 * Стриминговая генерация речи для больших текстов
 */
const streamTextToSpeech = function (text_1) {
    return __asyncGenerator(this, arguments, function* (text, options = {}) {
        try {
            console.log('[speech.service] Starting streaming text-to-speech');
            // Разбиваем длинный текст на части для стриминга
            const chunks = splitTextIntoChunks(text, 500); // Максимум 500 символов на чанк
            for (const chunk of chunks) {
                if (chunk.trim()) {
                    const audioBuffer = yield __await((0, exports.textToSpeech)(chunk, options));
                    yield yield __await(audioBuffer);
                }
            }
            console.log('[speech.service] Streaming text-to-speech completed');
        }
        catch (error) {
            console.error('[speech.service] Error in streaming text-to-speech:', error);
            throw new Error('Failed to stream text to speech');
        }
    });
};
exports.streamTextToSpeech = streamTextToSpeech;
/**
 * Утилита для разбиения текста на части
 */
function splitTextIntoChunks(text, maxLength) {
    const words = text.split(' ');
    const chunks = [];
    let currentChunk = '';
    for (const word of words) {
        if (currentChunk.length + word.length + 1 <= maxLength) {
            currentChunk += (currentChunk ? ' ' : '') + word;
        }
        else {
            if (currentChunk) {
                chunks.push(currentChunk);
            }
            currentChunk = word;
        }
    }
    if (currentChunk) {
        chunks.push(currentChunk);
    }
    return chunks;
}
/**
 * Проверка поддерживаемых языков для STT
 */
const getSupportedLanguages = () => {
    return {
        'en': 'English',
        'ru': 'Russian',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'pl': 'Polish',
        'tr': 'Turkish',
        'nl': 'Dutch',
        'ar': 'Arabic',
        'zh': 'Chinese',
        'ja': 'Japanese',
        'ko': 'Korean',
        'hi': 'Hindi',
    };
};
exports.getSupportedLanguages = getSupportedLanguages;
/**
 * Преобразование речи в текст используя OpenAI Whisper для потоковых чанков
 * Накапливает чанки до достижения минимального размера перед обработкой
 */
const speechToTextStreaming = (audioBuffer, language) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (audioBuffer.length === 0) {
            return null;
        }
        // Очищаем старые временные файлы
        cleanupOldTempFiles();
        console.log(`[speech.service] Processing streaming chunk, size: ${audioBuffer.length} bytes`);
        // Создаем временный файл с правильным расширением
        const tempFileName = `temp_streaming_${Date.now()}.webm`;
        const tempFilePath = path_1.default.join(__dirname, '../../temp', tempFileName);
        // Убеждаемся что папка temp существует
        const tempDir = path_1.default.dirname(tempFilePath);
        if (!fs_1.default.existsSync(tempDir)) {
            fs_1.default.mkdirSync(tempDir, { recursive: true });
        }
        // Сохраняем объединенный буфер
        fs_1.default.writeFileSync(tempFilePath, audioBuffer);
        const transcription = yield openai.audio.transcriptions.create({
            file: fs_1.default.createReadStream(tempFilePath),
            model: 'whisper-1',
            language: language,
            response_format: 'verbose_json',
        });
        // Удаляем временный файл сразу после использования
        try {
            fs_1.default.unlinkSync(tempFilePath);
        }
        catch (err) {
            console.error('[speech.service] Failed to delete streaming temp file:', err);
        }
        console.log(`[speech.service] Streaming STT completed: "${transcription.text}"`);
        return {
            text: transcription.text,
            language: transcription.language,
            duration: transcription.duration,
        };
    }
    catch (error) {
        console.error('[speech.service] Error in streaming speech-to-text:', error);
        return null;
    }
});
exports.speechToTextStreaming = speechToTextStreaming;
/**
 * Проверка, достаточно ли данных для обработки
 */
const hasEnoughAudioData = (audioChunks, minDurationMs = 3000) => {
    const totalSize = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    // Примерная оценка: WebM ~16kb/sec для речи
    const estimatedDurationMs = (totalSize / 16) * 1000;
    return estimatedDurationMs >= minDurationMs;
};
exports.hasEnoughAudioData = hasEnoughAudioData;
