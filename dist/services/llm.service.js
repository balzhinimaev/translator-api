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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
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
exports.streamTranslateText = exports.translateText = void 0;
// src/services/llm.service.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const openai_1 = __importDefault(require("openai"));
console.log("[llm.service.ts] Читаю API Key:", process.env.OPENAI_API_KEY ? "ДА" : "НЕТ");
console.log("[llm.service.ts] Читаю модель:", process.env.OPENAI_MODEL);
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
const translateText = (text, src_lang, dst_lang) => __awaiter(void 0, void 0, void 0, function* () {
    // Имитация задержки
    yield new Promise((resolve) => setTimeout(resolve, 300));
    return {
        translated_text: `[Перевод] ${text}`,
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
    };
});
exports.translateText = translateText;
const streamTranslateText = function (text, src_lang, dst_lang, glossary) {
    return __asyncGenerator(this, arguments, function* () {
        var _a, e_1, _b, _c;
        var _d, _e;
        console.log(`[llm.service] New translation request:
    - Text: "${text}"
    - From: ${src_lang}
    - To: ${dst_lang}
    - Glossary: ${glossary ? JSON.stringify(glossary, null, 2) : 'N/A'}`);
        let systemPrompt = `You are a machine translation engine. Your task is to translate the text provided by the user from '${src_lang}' to '${dst_lang}'. Do not add any extra explanations, apologies, or conversational phrases. Output ONLY the translated text.`;
        if (glossary && glossary.length > 0) {
            const glossaryTerms = glossary.map(term => `"${term.src}" must be translated as "${term.dst}"`).join(', ');
            systemPrompt += `\n\nStrictly follow this glossary: ${glossaryTerms}.`;
        }
        console.log(`[llm.service] Final system prompt for OpenAI:\n${systemPrompt}`);
        const stream = yield __await(openai.chat.completions.create({
            model: process.env.OPENAI_MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: text },
            ],
            stream: true,
        }));
        try {
            for (var _f = true, stream_1 = __asyncValues(stream), stream_1_1; stream_1_1 = yield __await(stream_1.next()), _a = stream_1_1.done, !_a; _f = true) {
                _c = stream_1_1.value;
                _f = false;
                const chunk = _c;
                const delta = ((_e = (_d = chunk.choices[0]) === null || _d === void 0 ? void 0 : _d.delta) === null || _e === void 0 ? void 0 : _e.content) || '';
                if (delta) {
                    yield yield __await({ delta });
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_f && !_a && (_b = stream_1.return)) yield __await(_b.call(stream_1));
            }
            finally { if (e_1) throw e_1.error; }
        }
        console.log(`[llm.service] Stream finished for text: "${text}"`);
        // usage не возвращается в стриминговом режиме
    });
};
exports.streamTranslateText = streamTranslateText;
