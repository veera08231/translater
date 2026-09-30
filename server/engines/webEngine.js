/**
 * Free online translation — no API key, no account, no cost.
 *
 * Two well-known public services are used, in order, and only when the
 * bundled dictionary cannot do the job on its own:
 *
 *   1. source -> English   (Google's public endpoint, then MyMemory)
 *      then English -> Sanskrit with our own dictionary, which gives the most
 *      natural classical Sanskrit for everyday sentences.
 *   2. source -> Sanskrit  (MyMemory first, it stays closer to classical
 *      forms, then Google) as a fallback for anything left over.
 *
 * Nothing is stored anywhere except our own cache, and a failed provider is
 * simply skipped — this module never throws.
 */

const { translateFree, detectLanguage } = require('./freeEngine');

const TIMEOUT_MS = 12_000;
const MAX_CHARS = 400; // per chunk, well inside every free limit
const MAX_CHUNKS = 8;
/** Below this dictionary coverage we ask the internet instead. */
const DICTIONARY_GOOD_ENOUGH = 60;

/** Providers that have run out of quota are skipped for the rest of the run. */
const disabled = new Set();

function chunkText(text) {
  const parts = String(text).match(/[^.!?।॥\n]+[.!?।॥\n]*/g) || [String(text)];

  // A single long block with no punctuation still has to be split.
  const pieces = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.length <= MAX_CHARS) {
      pieces.push(trimmed);
      continue;
    }

    let buffer = '';
    for (const word of trimmed.split(/\s+/)) {
      if ((`${buffer} ${word}`).trim().length > MAX_CHARS) {
        if (buffer) pieces.push(buffer);
        buffer = word.slice(0, MAX_CHARS);
      } else {
        buffer = `${buffer} ${word}`.trim();
      }
    }
    if (buffer) pieces.push(buffer);
  }

  // Merge small pieces so we make as few requests as possible.
  const chunks = [];
  let current = '';

  for (const piece of pieces) {
    if ((`${current} ${piece}`).trim().length > MAX_CHARS) {
      if (current) chunks.push(current);
      current = piece;
    } else {
      current = `${current} ${piece}`.trim();
    }

    if (chunks.length >= MAX_CHUNKS) break;
  }

  if (current && chunks.length < MAX_CHUNKS) chunks.push(current);
  return chunks.filter(Boolean);
}

async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** MyMemory: the official free translation API (no key, ~5000 words/day). */
async function myMemory(text, from, to) {
  if (disabled.has('mymemory')) return null;

  const url =
    'https://api.mymemory.translated.net/get?q=' +
    encodeURIComponent(text.slice(0, 480)) +
    `&langpair=${from}|${to}`;

  try {
    const data = await getJson(url);
    const result = data?.responseData?.translatedText;
    if (!result || /MYMEMORY WARNING|INVALID LANGUAGE|QUOTA/i.test(result)) {
      if (/QUOTA/i.test(String(result))) disabled.add('mymemory');
      return null;
    }
    return result;
  } catch {
    return null;
  }
}

/** Google's public translate endpoint: unlimited, used only server-side. */
async function google(text, from, to) {
  if (disabled.has('google')) return null;

  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' +
    from +
    '&tl=' +
    to +
    '&dt=t&q=' +
    encodeURIComponent(text.slice(0, 480));

  try {
    const data = await getJson(url);
    const result = Array.isArray(data?.[0]) ? data[0].map((part) => part[0]).join('') : '';
    return result || null;
  } catch {
    return null;
  }
}

/** Any provider, in order, for one piece of text. */
async function translateChunk(text, from, to, order) {
  for (const name of order) {
    const result =
      name === 'google'
        ? await google(text, from, to)
        : await myMemory(text, from, to);

    if (result && isUsable(result, text, to)) return result.trim();
  }
  return null;
}

const TO_ENGLISH = ['google', 'mymemory'];
const TO_SANSKRIT = ['mymemory', 'google'];

const HAS_DEVANAGARI = /[\u0900-\u097F]/;

/**
 * A free service can hand back the original words instead of a translation
 * ("guten day" for German input). When we asked for Sanskrit, anything that is
 * not Sanskrit-looking is thrown away so the dictionary result is used instead.
 */
function isUsable(text, sourceText, target) {
  if (!text || !text.trim()) return false;
  if (target !== 'sa') return true;
  // The source was already in Devanagari, so there is nothing to compare with.
  return HAS_DEVANAGARI.test(text) || HAS_DEVANAGARI.test(sourceText);
}

/** Translates a whole text (long texts are split into sentences). */
async function translateAll(text, from, to, order) {
  const chunks = chunkText(text);
  if (!chunks.length) return null;

  const pieces = [];
  for (const chunk of chunks) {
    const result = await translateChunk(chunk, from, to, order);
    if (!result) return pieces.length ? pieces.join(' ') : null;
    pieces.push(result);
  }
  return pieces.join(' ');
}

/**
 * Uses the free online services only when the bundled dictionary is not
 * confident. The dictionary always wins, because its Sanskrit is curated.
 */
async function translateWithFreeApis(text, fallback) {
  const language = detectLanguage(text);

  // If it looks like English but our dictionary knows almost none of it, the
  // text is probably a different language written in Latin letters — so let the
  // service work out what it really is instead of guessing.
  const confident = language.code && language.code !== 'unknown';
  const source = confident && (language.code !== 'en' || fallback.coverage >= 40)
    ? language.code
    : 'auto';

  // Real English: no detour needed, ask for Sanskrit straight away.
  if (source === 'en') {
    const direct = await translateAll(text, 'en', 'sa', TO_SANSKRIT);
    if (direct) return { ...fallback, sanskrit: direct, engine: 'web', usedService: true };
    return fallback;
  }

  // Anything else: source -> English -> our dictionary first.
  const english = await translateAll(text, source, 'en', TO_ENGLISH);
  if (english) {
    const viaDictionary = translateFree(english);
    if (viaDictionary.coverage >= 40) {
      return {
        ...viaDictionary,
        detectedLanguage: language.name,
        detectedCode: language.code,
        sanskrit: viaDictionary.sanskrit,
        engine: 'web',
        usedService: true,
      };
    }
  }

  // Still nothing good: ask for Sanskrit directly.
  const direct = await translateAll(text, source, 'sa', TO_SANSKRIT);
  if (direct) {
    return {
      ...fallback,
      sanskrit: direct,
      engine: 'web',
      usedService: true,
    };
  }

  // No service answered — the dictionary result is still the best we have.
  return fallback;
}

module.exports = { translateWithFreeApis, chunkText, translateAll };