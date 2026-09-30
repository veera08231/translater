/**
 * The free translation engine — no AI model, no API key, no cost.
 *
 * How it works:
 *   1. Whole phrases are replaced first ("thank you" -> धन्यवादः).
 *   2. Each word is looked up in the bundled Sanskrit dictionary — by its own
 *      script, then by its sound (Devanagari -> Latin), then in English.
 *   3. Verbs are conjugated for the subject seen in the sentence, so
 *      "I go" becomes अहं गच्छामि and not अहं गच्छति.
 *   4. Numbers are written out as Sanskrit numerals.
 *   5. Any word it does not know is passed through untouched — the engine
 *      never invents a Sanskrit word for something it cannot translate.
 *
 * The result is always verified:false, so the app shows
 * "Please double-check this translation".
 */

const { WORDS, VERB_FORMS, PHRASES, NATIVE } = require('./lexicon');
const {
  tokenize,
  toLatinKey,
  stemsOf,
  numberToSanskrit,
  SCRIPT_TESTS,
} = require('./translit');

/** Which verb ending to use, by the subject of the sentence. */
const PERSON_OF = {
  i: 0, me: 0, my: 0, mine: 0, myself: 0,
  we: 3, us: 3, our: 3, ours: 3,
  you: 1, your: 1, yours: 1,
  he: 2, him: 2, his: 2, she: 2, her: 2, it: 2, its: 2,
  they: 4, them: 4, their: 4,
};

/** Distinctive words that reveal a language written in Latin letters. */
const ROMANISED_HINTS = [
  { code: 'ta', name: 'Tamil', words: ['thanni', 'vannakkam', 'vanakkam', 'nanban', 'kadhal', 'moondru', 'nandri', 'eppadi', 'naan', 'enna', 'kovil', 'saalai', 'palli', 'anbu', 'rendu'] },
  { code: 'hi', name: 'Hindi', words: ['paani', 'ghar', 'aadmi', 'nahi', 'dhanyavad', 'bhai', 'behen', 'kitaab', 'shehar', 'mahina', 'kaam', 'haan', 'pyaar'] },
  { code: 'te', name: 'Telugu', words: ['nenu', 'eeroju', 'eppudu', 'akkada', 'ikkada', 'manchi', 'chaala', 'nijam', 'raatri'] },
  { code: 'kn', name: 'Kannada', words: ['geleya', 'kelsa', 'mane', 'naanu', 'namaskara', 'kannada'] },
  { code: 'ml', name: 'Malayalam', words: ['vellam', 'entha', 'njan', 'kshethram', 'kadakkunnu'] },
  { code: 'bn', name: 'Bengali', words: ['kemon', 'bhalo', 'khub', 'kothay', 'tomar'] },
  { code: 'gu', name: 'Gujarati', words: ['kem', 'chho', 'saru', 'aabhar', 'kyaan'] },
];

/**
 * Languages written in Latin letters.
 *
 * English comes first so it wins when two languages score the same — and so
 * everyday English sentences are never mistaken for Dutch or Portuguese.
 */
const LATIN_HINTS = [
  { code: 'en', name: 'English', words: ['the', 'is', 'are', 'was', 'were', 'and', 'of', 'to', 'in', 'on', 'for', 'with', 'this', 'that', 'it', 'i', 'you', 'we', 'they', 'he', 'she', 'not', 'no', 'yes', 'my', 'your', 'what', 'where', 'when', 'how', 'why', 'good', 'morning', 'night', 'water', 'house', 'world', 'hello', 'thank', 'please', 'love'] },
  { code: 'fr', name: 'French', words: ['le', 'la', 'les', 'de', 'des', 'et', 'est', 'une', 'un', 'que', 'pour', 'dans', 'avec', 'vous', 'bonjour', 'merci', 'beaucoup', 'jour', 'monde', 'maison', 'eau', 'grand', 'petit', 'sont', 'avec', 'tout', 'nous'] },
  { code: 'de', name: 'German', words: ['der', 'die', 'das', 'und', 'ist', 'nicht', 'ein', 'eine', 'mit', 'ich', 'sie', 'auch', 'sehr', 'guten', 'tag', 'haus', 'wasser', 'groß', 'klein', 'danke', 'haben', 'sein', 'werden', 'nicht'] },
  { code: 'es', name: 'Spanish', words: ['el', 'los', 'las', 'de', 'que', 'en', 'por', 'para', 'con', 'una', 'es', 'está', 'pero', 'también', 'mucho', 'hola', 'gracias', 'mundo', 'casa', 'agua', 'grande', 'pequeño', 'buenos', 'dias', 'días', 'quiero', 'tengo', 'amigo', 'comer', 'beber', 'trabajo'] },
  { code: 'pt', name: 'Portuguese', words: ['os', 'as', 'que', 'em', 'para', 'com', 'uma', 'não', 'você', 'está', 'muito', 'obrigado', 'olá', 'mundo', 'casa', 'água', 'dia', 'bom', 'boa', 'obrigada', 'tenho', 'amigo'] },
  { code: 'it', name: 'Italian', words: ['il', 'lo', 'gli', 'di', 'che', 'per', 'con', 'una', 'sono', 'anche', 'molto', 'ciao', 'grazie', 'mondo', 'casa', 'acqua', 'giorno', 'buongiorno'] },
  { code: 'nl', name: 'Dutch', words: ['het', 'een', 'en', 'van', 'niet', 'met', 'hallo', 'dank', 'dag', 'huis', 'met', 'zijn', 'worden'] },
  { code: 'vi', name: 'Vietnamese', words: ['và', 'của', 'là', 'không', 'những', 'người', 'xin', 'cảm', 'ơn', 'chào', 'nước', 'nhà', 'được', 'tôi', 'muốn'] },
  { code: 'id', name: 'Indonesian', words: ['yang', 'untuk', 'tidak', 'ini', 'itu', 'adalah', 'saya', 'dengan', 'terima', 'kasih', 'selamat', 'air', 'rumah', 'hari', 'saya', 'mau'] },
  { code: 'tr', name: 'Turkish', words: ['ve', 'bir', 'bu', 'ile', 'için', 'değil', 'merhaba', 'teşekkür', 'çok', 'nasıl', 'daha', 'olan', 'gibi', 'günaydın', 'var', 'yok'] },
  { code: 'pl', name: 'Polish', words: ['nie', 'jest', 'się', 'dzień', 'dobry', 'dziękuję', 'woda', 'dom'] },
];

/** The language of a piece of text, judged by its script (or its sounds). */
function detectLanguage(text) {
  for (const rule of SCRIPT_TESTS) {
    if (rule.re.test(text)) return { code: rule.code, name: rule.name };
  }

  const lower = text.toLowerCase();

  // European languages, by their most common words.
  let best = null;
  for (const hint of LATIN_HINTS) {
    let score = 0;
    for (const word of hint.words) {
      if (new RegExp(`(^|[^\\p{L}])${word}([^\\p{L}]|$)`, 'iu').test(lower)) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { lang: hint, score };
  }
  if (best && best.score >= 2) return { code: best.lang.code, name: best.lang.name };

  for (const hint of ROMANISED_HINTS) {
    if (hint.words.some((word) => new RegExp(`\\b${word}\\b`, 'iu').test(lower))) {
      return { code: hint.code, name: `${hint.name} (English letters)` };
    }
  }

  return { code: 'en', name: 'English' };
}

/** Looks a single word up. Returns null when we do not know it. */
function lookupWord(word, personIndex) {
  const trimmed = String(word).replace(/^[^0-9A-Za-z\u00C0-\uFFFF]+|[^0-9A-Za-z\u00C0-\uFFFF]+$/g, '');
  if (!trimmed) return null;

  // Numbers, written as numerals.
  if (/^\d+$/.test(trimmed)) {
    const spoken = numberToSanskrit(Number(trimmed));
    return spoken ? { sanskrit: spoken, kind: 'number' } : null;
  }

  const has = (dictionary, key) => Object.prototype.hasOwnProperty.call(dictionary, key);
  const asHit = (value) => (value === '' ? { sanskrit: '', kind: 'dropped' } : { sanskrit: value, kind: 'word' });

  // 1. Exactly as written (Tamil, Telugu, Devanagari, romanised ...).
  if (has(NATIVE, trimmed)) return asHit(NATIVE[trimmed]);

  const lower = trimmed.toLowerCase();
  if (has(NATIVE, lower)) return asHit(NATIVE[lower]);

  const stems = stemsOf(lower);

  // 2. Verbs, conjugated for the subject ("goes" -> "go" -> गच्छामि).
  for (const stem of stems) {
    const verb = VERB_FORMS[stem];
    if (verb) {
      const forms = verb.split(',');
      const chosen = forms.length === 5 ? forms[personIndex] || forms[2] : verb;
      return { sanskrit: chosen, kind: 'verb' };
    }
  }

  // 3. English words, with simple stemming ("running" -> "run").
  for (const stem of stems) {
    if (has(WORDS, stem)) return asHit(WORDS[stem]);
  }

  // 4. Devanagari read by its sound: नमस्ते -> "namaste".
  if (/[\u0900-\u097F]/.test(trimmed)) {
    const sound = toLatinKey(trimmed);
    if (sound) {
      if (has(NATIVE, sound)) return asHit(NATIVE[sound]);
      for (const stem of stemsOf(sound)) {
        if (has(WORDS, stem)) return asHit(WORDS[stem]);
      }
    }
  }

  return null;
}

/**
 * @param {string} text
 * @returns {{ sanskrit: string, detectedLanguage: string, detectedCode: string,
 *            verified: boolean, engine: string, coverage: number,
 *            unknownWords: string[] }}
 */
function translateFree(text) {
  const language = detectLanguage(text);

  const unknownWords = [];
  let known = 0;
  let total = 0;

  let working = String(text).replace(/\s+/g, ' ').trim();

  // 1. Phrases first, longest first, so "good morning" beats "good".
  //    A phrase is skipped when a subject word sits right in front of it —
  //    otherwise "I go home" would swallow the verb and lose the person.
  const placeholders = new Map();
  Object.keys(PHRASES)
    .sort((a, b) => b.length - a.length)
    .forEach((phrase, index) => {
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(^|\\W)${escaped}(?=\\W|$)`, 'gi');

      const found = pattern.exec(working);
      if (!found) return;

      const before = working.slice(0, found.index).trim().split(/[\s]+/).pop() || '';
      if (before && PERSON_OF[before.toLowerCase()] !== undefined) return;

      const token = `\u0001${index}\u0001`;
      placeholders.set(token, PHRASES[phrase]);
      working = working.replace(pattern, `$1${token}`);
    });

  // 2. Word by word, tracking who the sentence is about.
  let personIndex = 2; // "he / she / it" is the safest default
  const translated = [];

  for (const token of tokenize(working)) {
    const phrase = placeholders.get(token);
    if (phrase) {
      translated.push(phrase);
      total += 1;
      known += 1;
      continue;
    }

    const plain = token.toLowerCase();
    if (PERSON_OF[plain] !== undefined) personIndex = PERSON_OF[plain];

    const hit = lookupWord(token, personIndex);
    total += 1;

    if (hit) {
      known += 1;
      // Words with no Sanskrit equivalent (like Hindi "का") are dropped.
      if (hit.sanskrit) translated.push(hit.sanskrit);
    } else {
      unknownWords.push(token);
      translated.push(token);
    }
  }

  return {
    sanskrit: translated.join(' ').replace(/\s+/g, ' ').trim(),
    detectedLanguage: language.name,
    detectedCode: language.code,
    // A dictionary cannot promise grammar, so the app always shows the
    // "please double-check" note for free translations.
    verified: false,
    engine: 'free',
    coverage: total ? Math.round((known / total) * 100) : 0,
    unknownWords,
  };
}

module.exports = { translateFree, detectLanguage, lookupWord };