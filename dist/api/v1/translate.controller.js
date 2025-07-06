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
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTranslate = exports.WsRequestSchema = exports.TranslatePayloadSchema = void 0;
const zod_1 = require("zod");
const llm_service_1 = require("../../services/llm.service");
const TranslateRequestSchema = zod_1.z.object({
    src_lang: zod_1.z.string().length(2),
    dst_lang: zod_1.z.string().length(2),
    text: zod_1.z.string().max(2000),
    stream: zod_1.z.boolean().default(false),
    async: zod_1.z.boolean().default(false),
    // ... другие поля
});
// Схема для вложенного payload
exports.TranslatePayloadSchema = zod_1.z.object({
    src_lang: zod_1.z.string().length(2, "src_lang must be a 2-character string"),
    dst_lang: zod_1.z.string().length(2, "dst_lang must be a 2-character string"),
    text: zod_1.z.string().min(1).max(2000),
    glossary: zod_1.z.array(zod_1.z.object({ src: zod_1.z.string(), dst: zod_1.z.string() })).max(50).optional(),
});
// Схема для всего WebSocket-сообщения
exports.WsRequestSchema = zod_1.z.object({
    type: zod_1.z.literal('translate_request'),
    request_id: zod_1.z.string().uuid("request_id must be a valid UUID"),
    payload: exports.TranslatePayloadSchema,
});
const handleTranslate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c;
    // 1. Валидация
    const validationResult = TranslateRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
        res
            .status(400)
            .json({
            error: {
                code: "INVALID_PARAM",
                message: validationResult.error.message,
            },
        });
        return;
    }
    const { text, src_lang, dst_lang } = validationResult.data;
    // --- stream-режим ---
    if (validationResult.data.stream) {
        // Проверка на взаимоисключение с async
        if (validationResult.data.async) {
            res.status(400).json({ error: { code: 'INVALID_PARAM_COMBINATION', message: 'stream и async не могут быть использованы вместе' } });
            return;
        }
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        const stream = (0, llm_service_1.streamTranslateText)(text, src_lang, dst_lang);
        try {
            for (var _d = true, stream_1 = __asyncValues(stream), stream_1_1; stream_1_1 = yield stream_1.next(), _a = stream_1_1.done, !_a; _d = true) {
                _c = stream_1_1.value;
                _d = false;
                const chunk = _c;
                res.write(`event: chunk\ndata: ${JSON.stringify(chunk)}\n\n`);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = stream_1.return)) yield _b.call(stream_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        // Отправка финального сообщения
        res.write(`event: done\ndata: ${JSON.stringify({ translated_text: "...", usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } })}\n\n`);
        res.end();
        return;
    }
    // 2. Вызов сервиса (пока заглушки)
    const startTime = Date.now();
    const result = yield (0, llm_service_1.translateText)(text, src_lang, dst_lang);
    const latency_ms = Date.now() - startTime;
    // 3. Отправка ответа
    res.status(200).json(Object.assign(Object.assign({}, result), { latency_ms,
        src_lang,
        dst_lang, original_text: text }));
});
exports.handleTranslate = handleTranslate;
