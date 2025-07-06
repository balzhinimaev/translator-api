"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const speech_controller_1 = require("../../api/v1/speech.controller");
const router = (0, express_1.Router)();
// ВНИМАНИЕ: Эти роуты БЕЗ аутентификации только для демонстрации!
// В продакшене обязательно используйте authMiddleware
/**
 * @route POST /v1/speech-demo/translate
 * @desc Демо полного пайплайна перевода речи БЕЗ аутентификации
 * @access Public (только для демо!)
 */
router.post('/translate', speech_controller_1.uploadAudio, speech_controller_1.handleSpeechTranslate);
/**
 * @route POST /v1/speech-demo/stt
 * @desc Демо Speech-to-Text БЕЗ аутентификации
 * @access Public (только для демо!)
 */
router.post('/stt', speech_controller_1.uploadAudio, speech_controller_1.handleSpeechToText);
/**
 * @route POST /v1/speech-demo/tts
 * @desc Демо Text-to-Speech БЕЗ аутентификации
 * @access Public (только для демо!)
 */
router.post('/tts', speech_controller_1.handleTextToSpeech);
/**
 * @route GET /v1/speech-demo/languages
 * @desc Демо списка поддерживаемых языков БЕЗ аутентификации
 * @access Public (только для демо!)
 */
router.get('/languages', speech_controller_1.handleGetSupportedLanguages);
exports.default = router;
