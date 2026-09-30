/**
 * Tiny, fast, offline language detector.
 *
 * It runs while the user types so the "Tamil detected" tag appears instantly.
 * The backend still returns the authoritative language name with the
 * translation, which replaces this guess.
 *
 * Hermes-safe: no Unicode property escapes (`\p{...}` is not supported).
 */

export type DetectedLanguage = {
  /** ISO 639-1 code, e.g. "ta". */
  code: string;
  /** English name shown to the user, e.g. "Tamil". */
  name: string;
  /** Writing system, e.g. "Tamil". */
  script: string;
};

type ScriptRule = { script: string; re: RegExp };

const SCRIPT_RULES: ScriptRule[] = [
  { script: 'Japanese', re: /[\u3040-\u30FF\u31F0-\u31FF]/ },
  { script: 'Korean', re: /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/ },
  { script: 'Chinese', re: /[\u4E00-\u9FFF\u3400-\u4DBF]/ },
  { script: 'Devanagari', re: /[\u0900-\u097F]/ },
  { script: 'Bengali', re: /[\u0980-\u09FF]/ },
  { script: 'Gurmukhi', re: /[\u0A00-\u0A7F]/ },
  { script: 'Gujarati', re: /[\u0A80-\u0AFF]/ },
  { script: 'Oriya', re: /[\u0B00-\u0B7F]/ },
  { script: 'Tamil', re: /[\u0B80-\u0BFF]/ },
  { script: 'Telugu', re: /[\u0C00-\u0C7F]/ },
  { script: 'Kannada', re: /[\u0C80-\u0CFF]/ },
  { script: 'Malayalam', re: /[\u0D00-\u0D7F]/ },
  { script: 'Sinhala', re: /[\u0D80-\u0DFF]/ },
  { script: 'Thai', re: /[\u0E00-\u0E7F]/ },
  { script: 'Lao', re: /[\u0E80-\u0EFF]/ },
  { script: 'Tibetan', re: /[\u0F00-\u0FFF]/ },
  { script: 'Myanmar', re: /[\u1000-\u109F\uA9E0-\uA9FF]/ },
  { script: 'Khmer', re: /[\u1780-\u17FF]/ },
  { script: 'Georgian', re: /[\u10A0-\u10FF\u1C90-\u1CBF]/ },
  { script: 'Armenian', re: /[\u0530-\u058F]/ },
  { script: 'Hebrew', re: /[\u0590-\u05FF]/ },
  { script: 'Arabic', re: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/ },
  { script: 'Cyrillic', re: /[\u0400-\u04FF\u0500-\u052F]/ },
  { script: 'Greek', re: /[\u0370-\u03FF\u1F00-\u1FFF]/ },
];

const SCRIPT_DEFAULT: Record<string, DetectedLanguage> = {
  Japanese: { code: 'ja', name: 'Japanese', script: 'Japanese' },
  Korean: { code: 'ko', name: 'Korean', script: 'Korean' },
  Chinese: { code: 'zh', name: 'Chinese', script: 'Chinese' },
  Devanagari: { code: 'hi', name: 'Hindi', script: 'Devanagari' },
  Bengali: { code: 'bn', name: 'Bengali', script: 'Bengali' },
  Gurmukhi: { code: 'pa', name: 'Punjabi', script: 'Gurmukhi' },
  Gujarati: { code: 'gu', name: 'Gujarati', script: 'Gujarati' },
  Oriya: { code: 'or', name: 'Odia', script: 'Odia' },
  Tamil: { code: 'ta', name: 'Tamil', script: 'Tamil' },
  Telugu: { code: 'te', name: 'Telugu', script: 'Telugu' },
  Kannada: { code: 'kn', name: 'Kannada', script: 'Kannada' },
  Malayalam: { code: 'ml', name: 'Malayalam', script: 'Malayalam' },
  Sinhala: { code: 'si', name: 'Sinhala', script: 'Sinhala' },
  Thai: { code: 'th', name: 'Thai', script: 'Thai' },
  Lao: { code: 'lo', name: 'Lao', script: 'Lao' },
  Tibetan: { code: 'bo', name: 'Tibetan', script: 'Tibetan' },
  Myanmar: { code: 'my', name: 'Burmese', script: 'Myanmar' },
  Khmer: { code: 'km', name: 'Khmer', script: 'Khmer' },
  Georgian: { code: 'ka', name: 'Georgian', script: 'Georgian' },
  Armenian: { code: 'hy', name: 'Armenian', script: 'Armenian' },
  Hebrew: { code: 'he', name: 'Hebrew', script: 'Hebrew' },
  Arabic: { code: 'ar', name: 'Arabic', script: 'Arabic' },
  Cyrillic: { code: 'ru', name: 'Russian', script: 'Cyrillic' },
  Greek: { code: 'el', name: 'Greek', script: 'Greek' },
  Latin: { code: 'en', name: 'English', script: 'Latin' },
};

/** Words that separate languages that share the same script. */
const DEVANAGARI_HINTS: { lang: DetectedLanguage; words: string[] }[] = [
  {
    lang: { code: 'sa', name: 'Sanskrit', script: 'Devanagari' },
    words: ['अस्ति', 'भवति', 'इति', 'अपि', 'सर्वे', 'कथयति', 'गच्छति', 'आगच्छतु', 'दृश्यते', 'ज्ञातम्', 'वदति', 'श्रेयान्'],
  },
  {
    lang: { code: 'mr', name: 'Marathi', script: 'Devanagari' },
    words: ['आहे', 'आणि', 'मला', 'तुम्ही', 'नाही', 'काय', 'यांनी', 'मध्ये', 'साठी', 'त्या', 'आपण', 'कधी', 'लिहिले'],
  },
  {
    lang: { code: 'ne', name: 'Nepali', script: 'Devanagari' },
    words: ['छ', 'छन्', 'गर्न', 'गरे', 'लागि', 'भएको', 'हामी', 'तपाईं', 'ठीक', 'धेरै'],
  },
  {
    lang: { code: 'hi', name: 'Hindi', script: 'Devanagari' },
    words: ['है', 'हैं', 'का', 'की', 'के', 'मैं', 'और', 'नहीं', 'यह', 'आप', 'हम', 'क्या', 'लिए', 'साथ', 'बहुत', 'अच्छा'],
  },
];

const LATIN_HINTS: { lang: DetectedLanguage; words: string[] }[] = [
  {
    lang: { code: 'en', name: 'English', script: 'Latin' },
    words: ['the', 'and', 'is', 'are', 'you', 'of', 'to', 'in', 'that', 'have', 'with', 'for', 'not', 'this', 'was', 'hello', 'what', 'where', 'please', 'thank', 'good', 'morning', 'water', 'friend'],
  },
  {
    lang: { code: 'es', name: 'Spanish', script: 'Latin' },
    words: ['el', 'la', 'los', 'las', 'de', 'que', 'en', 'por', 'para', 'con', 'una', 'es', 'hola', 'gracias', 'pero', 'también', 'mucho', 'agua'],
  },
  {
    lang: { code: 'fr', name: 'French', script: 'Latin' },
    words: ['le', 'la', 'les', 'de', 'des', 'et', 'est', 'un', 'une', 'que', 'pour', 'dans', 'bonjour', 'merci', 'avec', 'vous', 'très', 'mais'],
  },
  {
    lang: { code: 'de', name: 'German', script: 'Latin' },
    words: ['der', 'die', 'das', 'und', 'ist', 'nicht', 'ein', 'eine', 'zu', 'mit', 'ich', 'hallo', 'danke', 'sie', 'auch', 'sehr', 'bitte'],
  },
  {
    lang: { code: 'pt', name: 'Portuguese', script: 'Latin' },
    words: ['os', 'as', 'que', 'em', 'para', 'com', 'uma', 'não', 'você', 'obrigado', 'olá', 'está', 'muito', 'por', 'como'],
  },
  {
    lang: { code: 'it', name: 'Italian', script: 'Latin' },
    words: ['il', 'lo', 'gli', 'di', 'che', 'per', 'con', 'una', 'sono', 'ciao', 'grazie', 'anche', 'molto', 'questo', 'dove'],
  },
  {
    lang: { code: 'tr', name: 'Turkish', script: 'Latin' },
    words: ['ve', 'bir', 'bu', 'ile', 'için', 'değil', 'merhaba', 'teşekkür', 'çok', 'nasıl', 'daha', 'olan', 'gibi'],
  },
  {
    lang: { code: 'vi', name: 'Vietnamese', script: 'Latin' },
    words: ['và', 'của', 'là', 'không', 'những', 'người', 'xin', 'cảm', 'ơn', 'có', 'được', 'trong', 'cho', 'một'],
  },
  {
    lang: { code: 'id', name: 'Indonesian', script: 'Latin' },
    words: ['dan', 'yang', 'di', 'untuk', 'tidak', 'ini', 'itu', 'terima', 'kasih', 'selamat', 'pagi', 'dengan', 'saya', 'apa'],
  },
];

function countMatches(text: string, re: RegExp): number {
  const matches = text.match(new RegExp(re.source, 'g'));
  return matches ? matches.length : 0;
}

function scoreHints<T extends { lang: DetectedLanguage; words: string[] }>(
  text: string,
  hints: T[],
): DetectedLanguage | null {
  let best: { lang: DetectedLanguage; score: number } | null = null;

  for (const hint of hints) {
    let score = 0;
    for (const word of hint.words) {
      if (text.includes(word)) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { lang: hint.lang, score };
    }
  }

  return best ? best.lang : null;
}

/**
 * Returns the detected language, or `null` when there is nothing to detect.
 * Digits and punctuation only -> `null`.
 */
export function detectLanguage(input: string): DetectedLanguage | null {
  const text = (input ?? '').trim();
  if (!text) return null;
  if (!/[A-Za-z\u00C0-\uFFFF]/.test(text)) return null;

  let topScript: string | null = null;
  let topCount = 0;
  for (const rule of SCRIPT_RULES) {
    const count = countMatches(text, rule.re);
    if (count > topCount) {
      topCount = count;
      topScript = rule.script;
    }
  }

  if (!topScript) {
    // Latin letters or digits only.
    return scoreHints(text.toLowerCase(), LATIN_HINTS) ?? SCRIPT_DEFAULT.English;
  }

  if (topScript === 'Devanagari') {
    return scoreHints(text, DEVANAGARI_HINTS) ?? SCRIPT_DEFAULT.Devanagari;
  }

  return SCRIPT_DEFAULT[topScript] ?? null;
}

/** "Tamil detected" — the label we show in the small tag. */
export function detectedLabel(lang: DetectedLanguage | null): string {
  return lang ? `${lang.name} detected` : 'Type some text to see the language';
}