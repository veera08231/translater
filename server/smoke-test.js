/**
 * Full test of the backend. No API key needed and nothing is spent:
 *   node smoke-test.js      (or: npm test)
 *
 * Covers the free dictionary engine, the dictionary's own integrity, OCR
 * cleaning, input validation, caching, and the AI round trip (translate ->
 * back-translate -> verify) against a fake model.
 */

const MOCK_PORT = 4111;

// Must be set before ./handlers is required (config reads the environment once).
process.env.OPENAI_API_KEY = 'test-key';
process.env.OPENAI_BASE_URL = `http://127.0.0.1:${MOCK_PORT}/v1`;

const config = require('./config');
const cache = require('./cache');
const { cleanOcrText } = require('./cleanOcr');
const { handleTranslate, handleOcr } = require('./handlers');
const { createMockModel } = require('./mock-model');
const { translateFree } = require('./engines/freeEngine');
const { translateWithFreeApis, chunkText } = require('./engines/webEngine');
const { WORDS, VERB_FORMS, PHRASES, NATIVE } = require('./engines/lexicon');

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ok    ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${name}${detail ? ` -> ${detail}` : ''}`);
    process.exitCode = 1;
  }
}

const DEVANAGARI = /^[\u0900-\u097F\s|]+$/;

async function main() {
  // ---------------------------------------------------- dictionary integrity
  console.log('\nDictionary');
  check('knows 400+ English words', Object.keys(WORDS).length > 400, String(Object.keys(WORDS).length));
  check('knows 1000+ words in other scripts', Object.keys(NATIVE).length > 1000, String(Object.keys(NATIVE).length));
  check('has 40 conjugated verbs', Object.keys(VERB_FORMS).length === 40, String(Object.keys(VERB_FORMS).length));
  check('has 40+ full phrases', Object.keys(PHRASES).length >= 40, String(Object.keys(PHRASES).length));

  const placeholders = [...Object.keys(WORDS), ...Object.keys(NATIVE)].filter((key) => /[0-9]$/.test(key));
  check('no leftover placeholder keys', placeholders.length === 0, placeholders.join(', '));

  const badValues = Object.entries(WORDS).filter(([, value]) => value !== '' && !DEVANAGARI.test(value));
  check('every English meaning is in Devanagari', badValues.length === 0, JSON.stringify(badValues.slice(0, 3)));

  const badVerbs = Object.entries(VERB_FORMS).filter(([, value]) => value.split(',').length !== 5);
  check('every verb has all five persons', badVerbs.length === 0, JSON.stringify(badVerbs.slice(0, 3)));

  // --------------------------------------------------------------- free engine
  console.log('\nFree engine (no key, no cost)');
  const hello = translateFree('Hello world');
  check('translates a simple sentence', hello.sanskrit === 'नमस्ते लोकः', hello.sanskrit);
  check('uses whole phrases first', translateFree('thank you').sanskrit === 'धन्यवादः');
  check('drops words Sanskrit does not need', !translateFree('The water is cold').sanskrit.includes('The'));
  check('understands every word in it', translateFree('The water is cold').coverage === 100);

  const iGo = translateFree('I go home');
  check('conjugates for "I"', iGo.sanskrit.includes('गच्छामि'), iGo.sanskrit);
  const heGoes = translateFree('he goes home');
  check('conjugates for "he"', heGoes.sanskrit.includes('गच्छति'), heGoes.sanskrit);
  check('writes numbers as Sanskrit', translateFree('4 people').sanskrit.startsWith('चत्वारि'), translateFree('4 people').sanskrit);

  check('reads Tamil', translateFree('வணக்கம் நண்பன்').sanskrit === 'नमस्ते मित्रम्', translateFree('வணக்கம் நண்பன்').sanskrit);
  check('reads everyday Tamil', translateFree('சூரியன் மாலை').sanskrit === 'सूर्यः सायंकालः', translateFree('சூரியன் மாலை').sanskrit);
  check('reads Tamil numbers', translateFree('ஐந்து').sanskrit === 'पञ्च', translateFree('ஐந்து').sanskrit);
  check('reads Devanagari', translateFree('पानी ठीक है').sanskrit === 'जलम् सम्यक् अस्ति', translateFree('पानी ठीक है').sanskrit);
  check('reads romanised Tamil', translateFree('thanni').sanskrit === 'जलम्', translateFree('thanni').sanskrit);

  const unknown = translateFree('My name is Veera');
  check('passes unknown words through', unknown.sanskrit.includes('Veera'), unknown.sanskrit);
  check('lists what it could not translate', unknown.unknownWords.includes('Veera'));
  check('never claims to be verified', hello.verified === false);

  // -------------------------------------------------------------- OCR cleaning
  console.log('\nOCR cleaning');
  check('drops noise lines', cleanOcrText('|  |  ***\nThe sky is blue.\n::::\nWater is cold.') === 'The sky is blue.\nWater is cold.');
  check('joins words split across lines', cleanOcrText('transla-\ntion is hard') === 'translation is hard');
  check('re-flows wrapped sentences', cleanOcrText('I went to the\nmarket today.') === 'I went to the market today.');
  check('keeps paragraph breaks', cleanOcrText('First line.\n\nSecond line.') === 'First line.\n\nSecond line.');
  check('keeps Devanagari', cleanOcrText('नमस्ते') === 'नमस्ते');
  check('keeps Tamil', cleanOcrText('வணக்கம்') === 'வணக்கம்');

  // --------------------------------------------------------------------- cache
  console.log('\nCache');
  check('same text gives the same key', cache.keyOf(['m', 'a']) === cache.keyOf(['m', 'a']));
  check('different text gives a different key', cache.keyOf(['m', 'a']) !== cache.keyOf(['m', 'b']));
  cache.set('probe', { value: 1 });
  check('reads back what it stored', cache.get('probe')?.value === 1);
  check('unknown key returns nothing', cache.get('missing-key') === undefined);

  // ------------------------------------------------------- with no API key
  console.log('\nWith no API key (the free setup)');
  const savedKey = config.OPENAI_API_KEY;
  config.OPENAI_API_KEY = '';

  const free = await handleTranslate({ text: 'Hello world' });
  check('still translates', free.status === 200 && free.body.sanskrit === 'नमस्ते लोकः', JSON.stringify(free.body));
  check('says which engine was used', free.body.engine === 'free');
  check('warns the user to check it', free.body.verified === false);

  const noVision = await handleOcr({ image: 'aGVsbG8=', mimeType: 'image/jpeg' });
  check('photo reading reports itself as unavailable', noVision.status === 503 && noVision.body.code === 'no_ocr');

  config.OPENAI_API_KEY = savedKey;

  // -------------------------------------------------------- input validation
  console.log('\nInput validation');
  const empty = await handleTranslate({ text: '   ' });
  check('rejects empty text', empty.status === 400 && empty.body.code === 'empty');
  const tooLong = await handleTranslate({ text: 'a'.repeat(9000) });
  check('rejects very long text', tooLong.status === 400);
  const noImage = await handleOcr({});
  check('rejects a missing image', noImage.status === 400);

  // --------------------------------------------------- AI engine + verification
  console.log('\nAI engine + verification (fake model)');
  const model = createMockModel();
  await new Promise((resolve) => model.listen(MOCK_PORT, '127.0.0.1', resolve));
  config.TRANSLATE_ENGINE = 'llm';

  const tamil = 'வணக்கம் உலகம்';
  const first = await handleTranslate({ text: tamil });
  check('returns 200', first.status === 200, JSON.stringify(first.body));
  check('uses the AI engine', first.body.engine === 'llm');
  check('returns the Sanskrit text', first.body.sanskrit === 'स्वागतम् संसारः', first.body.sanskrit);
  check('names the detected language', first.body.detectedLanguage === 'Tamil');
  check('returns a language code', first.body.detectedCode === 'ta');
  check('passes verification', first.body.verified === true);
  check('is not cached yet', first.body.cached === false);

  const second = await handleTranslate({ text: tamil });
  check('same input is served from cache', second.body.cached === true);
  check('cache returns the same Sanskrit', second.body.sanskrit === first.body.sanskrit);
  check('cache returns the same verdict', second.body.verified === first.body.verified);

  const mismatched = await handleTranslate({ text: 'MISMATCH this sentence' });
  check('warns when the meaning does not match', mismatched.body.verified === false);

  config.TRANSLATE_ENGINE = 'free';
  model.close();

  // ------------------------------------------------- free online services
  // The network is stubbed, so this part of the test never leaves the computer.
  console.log('\nFree online services (stubbed — no network)');

  check('keeps short sentences in one request', chunkText('One. Two. Three.').length === 1);
  check('keeps a short text as one piece', chunkText('Just one short line').length === 1);
  check('splits long text into several requests', chunkText('word '.repeat(400)).length > 1);
  check('never sends more than 400 characters', chunkText('word '.repeat(400)).every((chunk) => chunk.length <= 400), JSON.stringify(chunkText('word '.repeat(400)).map((c) => c.length)));

  const realFetch = global.fetch;
  global.fetch = async (url) => {
    const target = String(url).includes('langpair=')
      ? decodeURIComponent(String(url)).split('|')[1]
      : new URL(String(url)).searchParams.get('tl');

    // The stub answers with real Devanagari, except when we ask it to fail.
    const broken = String(url).includes('BROKEN');
    if (broken) return { ok: true, status: 200, json: async () => [['guten day']] };
    if (target === 'en') return { ok: true, status: 200, json: async () => ['hello world'] };
    return {
      ok: true,
      status: 200,
      json: async () => ({ responseData: { translatedText: 'नमस्ते' } }),
    };
  };

  const french = translateFree('bonjour le monde');
  check('the dictionary is unsure about French', french.coverage < 60);

  const viaService = await translateWithFreeApis('bonjour le monde', french);
  check('falls back to the online service', viaService.engine === 'web', viaService.engine);
  check('still produces Sanskrit', /[\u0900-\u097F]/.test(viaService.sanskrit), viaService.sanskrit);
  check('keeps the real language name', viaService.detectedLanguage === 'French', viaService.detectedLanguage);

  // A service that just echoes the input must never be used.
  global.fetch = async (url) => {
    if (String(url).includes('translate_a')) {
      return { ok: true, status: 200, json: async () => [['guten day']] };
    }
    const target = new URL(String(url)).searchParams.get('tl');
    return { ok: true, status: 200, json: async () => ({ responseData: { translatedText: target === 'en' ? 'guten tag' : 'guten tag' } }) };
  };

  const german = translateFree('guten tag');
  const viaBadService = await translateWithFreeApis('guten tag', german);
  check('discards a service that echoes the input', viaBadService.sanskrit !== 'guten day', viaBadService.sanskrit);

  global.fetch = realFetch;

  // ------------------------------------------------------------------ summary
  console.log(`\n${passed} passed, ${failed} failed.`);
  console.log('All of this ran without paying for anything.\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});