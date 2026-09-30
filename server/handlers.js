/**
 * The two API endpoints.
 *
 * Every handler returns `{ status, body }` so the same code can be used by the
 * local Express server (server/index.js) and by Vercel functions (api/).
 */

const config = require('./config');
const cache = require('./cache');
const { cleanOcrText } = require('./cleanOcr');
const { chat, readImageText, ServerError } = require('./llm');
const {
  TRANSLATE_SYSTEM,
  translateUserMessage,
  BACK_TRANSLATE_SYSTEM,
  backTranslateUserMessage,
  JUDGE_SYSTEM,
  judgeUserMessage,
} = require('./prompts');

const LANGUAGE_CODES = {
  english: 'en',
  tamil: 'ta',
  telugu: 'te',
  kannada: 'kn',
  malayalam: 'ml',
  marathi: 'mr',
  hindi: 'hi',
  bengali: 'bn',
  gujarati: 'gu',
  punjabi: 'pa',
  odia: 'or',
  assamese: 'as',
  urdu: 'ur',
  nepali: 'ne',
  sanskrit: 'sa',
  burmese: 'my',
  thai: 'th',
  khmer: 'km',
  lao: 'lo',
  tibetan: 'bo',
  chinese: 'zh',
  japanese: 'ja',
  korean: 'ko',
  indonesian: 'id',
  malay: 'ms',
  arabic: 'ar',
  hebrew: 'he',
  persian: 'fa',
  turkish: 'tr',
  russian: 'ru',
  ukrainian: 'uk',
  greek: 'el',
  french: 'fr',
  german: 'de',
  spanish: 'es',
  portuguese: 'pt',
  italian: 'it',
  dutch: 'nl',
  polish: 'pl',
  vietnamese: 'vi',
  swahili: 'sw',
  zulu: 'zu',
  latin: 'la',
  tagalog: 'tl',
};

function languageCode(name) {
  return LANGUAGE_CODES[String(name || '').trim().toLowerCase()] || 'unknown';
}

function normalise(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function stripDecoration(value) {
  return String(value || '')
    .replace(/^```[a-z]*\n?/i, '')
    .replace(/```$/, '')
    .replace(/^\*\*|\*\*$/g, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();
}

/** The model answers with "<Language>\n<Sanskrit>". */
function parseTranslation(raw, fallbackText) {
  const cleaned = stripDecoration(raw);
  const lines = cleaned.split('\n').map((line) => line.trim()).filter(Boolean);

  const first = lines[0] || '';
  const looksLikeLanguageName = first.length > 0 && first.length <= 40 && /^[A-Za-z\s'-]+$/.test(first);

  if (lines.length > 1 && looksLikeLanguageName) {
    return {
      detectedLanguage: first.replace(/[:\-–—]+$/, '').trim(),
      sanskrit: stripDecoration(lines.slice(1).join('\n')),
    };
  }

  // The model ignored the format: keep the text, guess the language loosely.
  return {
    detectedLanguage: /[\u0900-\u097F]/.test(fallbackText) ? 'Sanskrit' : 'Unknown',
    sanskrit: cleaned,
  };
}

async function judge(original, backTranslation) {
  const answer = await chat({
    system: JUDGE_SYSTEM,
    user: judgeUserMessage(original, backTranslation),
    maxTokens: 60,
    json: true,
  });

  try {
    const parsed = JSON.parse(answer);
    return Boolean(parsed.matches);
  } catch {
    // Unreadable answer: do not accuse the translation, keep it.
    return true;
  }
}

async function translate({ text }) {
  const key = cache.keyOf([config.OPENAI_MODEL, text]);
  const hit = cache.get(key);
  if (hit) return { ...hit, cached: true };

  const raw = await chat({
    system: TRANSLATE_SYSTEM,
    user: translateUserMessage(text),
    maxTokens: 1500,
  });

  const { detectedLanguage, sanskrit } = parseTranslation(raw, text);
  if (!sanskrit) {
    throw new ServerError('unclear', 'The model returned no translation', 502);
  }

  let verified = true;
  let backTranslation;

  // Nothing to verify when the source is already Sanskrit.
  if (detectedLanguage.toLowerCase() !== 'sanskrit') {
    backTranslation = await chat({
      system: BACK_TRANSLATE_SYSTEM,
      user: backTranslateUserMessage(detectedLanguage, sanskrit),
      maxTokens: 1200,
    });

    if (normalise(backTranslation) && normalise(backTranslation) !== normalise(text)) {
      verified = await judge(text, backTranslation);
    }
  }

  const result = {
    sanskrit,
    detectedLanguage,
    detectedCode: languageCode(detectedLanguage),
    verified,
    backTranslation: backTranslation || undefined,
  };

  cache.set(key, result);
  return { ...result, cached: false };
}

async function handleTranslate(body) {
  const text = typeof body?.text === 'string' ? body.text.trim() : '';

  if (!text) return { status: 400, body: { code: 'empty', error: 'No text was sent.' } };
  if (text.length > config.MAX_TEXT_LENGTH) {
    return {
      status: 400,
      body: { code: 'unclear', error: 'The text is too long to translate.' },
    };
  }

  try {
    return { status: 200, body: await translate({ text }) };
  } catch (error) {
    return toErrorResponse(error);
  }
}

async function handleOcr(body) {
  const image = typeof body?.image === 'string' ? body.image : '';
  const mimeType = typeof body?.mimeType === 'string' ? body.mimeType : 'image/jpeg';

  if (!image) return { status: 400, body: { code: 'empty', error: 'No image was sent.' } };
  if (image.length * 0.75 > config.MAX_IMAGE_BYTES) {
    return { status: 400, body: { code: 'unclear', error: 'The photo is too large.' } };
  }

  try {
    const rawText = await readImageText({ base64: image, mimeType });
    return {
      status: 200,
      body: { rawText: rawText.trim(), text: cleanOcrText(rawText) },
    };
  } catch (error) {
    return toErrorResponse(error);
  }
}

function toErrorResponse(error) {
  if (error instanceof ServerError) {
    return { status: error.status, body: { code: error.code, error: error.message } };
  }
  // Never leak internals to the app.
  return {
    status: 500,
    body: { code: 'server', error: 'Unexpected server error.' },
  };
}

module.exports = { handleTranslate, handleOcr };