"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const speech_controller_1 = require("../../api/v1/speech.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Применяем аутентификацию ко всем роутам
router.use(auth_middleware_1.authMiddleware);
/**
 * @route POST /v1/speech/translate
 * @desc Полный пайплайн перевода речи: Speech -> Text -> Translation -> Speech
 * @access Private
 * @body {
 *   src_lang: string (2 chars),
 *   dst_lang: string (2 chars),
 *   voice?: string,
 *   speed?: number
 * }
 * @file audio: multipart/form-data
 */
router.post('/translate', speech_controller_1.uploadAudio, speech_controller_1.handleSpeechTranslate);
/**
 * @route POST /v1/speech/stt
 * @desc Преобразование речи в текст (Speech-to-Text)
 * @access Private
 * @query {language?: string}
 * @file audio: multipart/form-data
 */
router.post('/stt', speech_controller_1.uploadAudio, speech_controller_1.handleSpeechToText);
/**
 * @route POST /v1/speech/tts
 * @desc Преобразование текста в речь (Text-to-Speech)
 * @access Private
 * @body {
 *   text: string,
 *   voice?: string,
 *   speed?: number
 * }
 */
router.post('/tts', speech_controller_1.handleTextToSpeech);
/**
 * @route GET /v1/speech/languages
 * @desc Получение списка поддерживаемых языков
 * @access Private
 */
router.get('/languages', speech_controller_1.handleGetSupportedLanguages);
exports.default = router;
