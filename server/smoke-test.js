/**
 * Full test of the backend. No API key needed and nothing is spent:
 *   node server/smoke-test.js
 *
 * Covers OCR cleaning, input validation, caching, and the whole
 * translate -> back-translate -> verify round trip against a fake model.
 */

const assert = require('node:assert');

const MOCK_PORT = 4111;

// Must be set before ./handlers is required (config reads the environment once).
process.env.OPENAI_API_KEY = 'test-key';
process.env.OPENAI_BASE_URL = `http://127.0.0.1:${MOCK_PORT}/v1`;

const cache = require('./cache');
const { cleanOcrText } = require('./cleanOcr');
const { handleTranslate, handleOcr } = require('./handlers');
const { createMockModel } = require('./mock-model');

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

async function main() {
  const model = createMockModel();
  await new Promise((resolve) => model.listen(MOCK_PORT, '127.0.0.1', resolve));

  // ------------------------------------------------------------ OCR cleaning
  console.log('\nOCR cleaning');
  check(
    'drops noise lines',
    cleanOcrText('|  |  ***\nThe sky is blue.\n::::\nWater is cold.') ===
      'The sky is blue.\nWater is cold.',
  );
  check('joins words split across lines', cleanOcrText('transla-\ntion is hard') === 'translation is hard');
  check('re-flows wrapped sentences', cleanOcrText('I went to the\nmarket today.') === 'I went to the market today.');
  check('keeps paragraph breaks', cleanOcrText('First line.\n\nSecond line.') === 'First line.\n\nSecond line.');
  check('keeps Devanagari', cleanOcrText('नमस्ते') === 'नमस्ते');
  check('keeps Tamil', cleanOcrText('வணக்கம்') === 'வணக்கம்');

  // ------------------------------------------------------------------- cache
  console.log('\nCache');
  check('same text gives the same key', cache.keyOf(['m', 'a']) === cache.keyOf(['m', 'a']));
  check('different text gives a different key', cache.keyOf(['m', 'a']) !== cache.keyOf(['m', 'b']));
  cache.set('probe', { value: 1 });
  check('reads back what it stored', cache.get('probe')?.value === 1);
  check('unknown key returns nothing', cache.get('missing-key') === undefined);

  // --------------------------------------------------------- input validation
  console.log('\nInput validation');
  const empty = await handleTranslate({ text: '   ' });
  check('rejects empty text', empty.status === 400 && empty.body.code === 'empty');
  const tooLong = await handleTranslate({ text: 'a'.repeat(9000) });
  check('rejects very long text', tooLong.status === 400);
  const noImage = await handleOcr({});
  check('rejects a missing image', noImage.status === 400);

  // ----------------------------------------------------------- full round trip
  console.log('\nTranslate + verify (fake model)');
  const tamil = 'வணக்கம் உலகம்';

  const first = await handleTranslate({ text: tamil });
  check('returns 200', first.status === 200, JSON.stringify(first.body));
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

  const ocr = await handleOcr({ image: 'aGVsbG8=', mimeType: 'image/jpeg' });
  check(
    'OCR cleans the text it read',
    ocr.body.text === 'The sky is blue.\ntranslation is hard.',
    ocr.body.text,
  );
  check('OCR keeps the raw text too', ocr.body.rawText.length > 0);

  model.close();
  console.log(`\n${passed} passed, ${failed} failed.`);
  console.log('All of this ran without an API key.\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});