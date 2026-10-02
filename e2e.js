/**
 * End-to-end check against a running server — the exact calls the app makes.
 *   node e2e.js                                  # the live server
 *   node e2e.js http://localhost:3001            # your own machine
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const BASE = process.argv[2] || 'https://translater-5zmo.onrender.com';

let passed = 0;
let failed = 0;

function check(name, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  ok    ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${name}${detail ? ` -> ${detail}` : ''}`);
  }
}

async function call(pathname, body, timeoutMs = 120_000) {
  const started = Date.now();
  const response = await fetch(`${BASE}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  return { status: response.status, json: await response.json(), seconds: (Date.now() - started) / 1000 };
}

const DEVANAGARI = /[\u0900-\u097F]/;

async function main() {
  console.log(`\nEnd-to-end check of ${BASE}\n`);

  // 1. The app calls this when it opens.
  console.log('1. Opening the app (health check)');
  const health = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(90_000) });
  const info = await health.json();
  console.log(`   replied in ${(info ? '' : '')}`);
  check('server answers', health.ok, `HTTP ${health.status}`);
  check('translator is ready', info.ok === true);
  check('reading photos is on', info.ocrAvailable === true, JSON.stringify(info));

  // 2. Type tab: one press of Translate.
  console.log('\n2. Typing text and translating');
  const cases = [
    ['English', 'hello world', 'नमस्ते'],
    ['English', 'the water is cold', 'जलम्'],
    ['Hindi', 'नमस्ते दोस्त', 'नमस्ते'],
    ['Tamil', 'வணக்கம் நண்பன்', 'नमस्ते'],
    ['French', 'bonjour le monde', 'नमस्ते'],
  ];

  for (const [language, text, expect] of cases) {
    const result = await call('/api/translate', { text });
    const ok = result.status === 200 && DEVANAGARI.test(result.json.sanskrit || '');
    check(
      `${language}: "${text}"`,
      ok,
      `${result.status} ${JSON.stringify(result.json).slice(0, 90)}`,
    );
    if (ok) {
      console.log(`        -> ${result.json.sanskrit}  (${result.seconds.toFixed(1)}s, ${result.json.coverage}% words known)`);
    }
  }

  // 3. Scan tab: photo -> words -> Sanskrit.
  console.log('\n3. Scanning a photo');
  const image = path.join(os.tmpdir(), 'ocr-test.png');
  if (fs.existsSync(image)) {
    const started = Date.now();
    const ocr = await call('/api/ocr', {
      image: fs.readFileSync(image).toString('base64'),
      mimeType: 'image/png',
    });
    check('photo read', ocr.status === 200 && (ocr.json.text || '').length > 0, JSON.stringify(ocr.json).slice(0, 90));
    console.log(`        read in ${((Date.now() - started) / 1000).toFixed(1)}s: ${ocr.json.text}`);
    check('engine used was free', ocr.json.engine === 'tesseract', ocr.json.engine);

    if (ocr.status === 200) {
      const translated = await call('/api/translate', { text: ocr.json.text });
      check('photo words translated to Sanskrit', DEVANAGARI.test(translated.json.sanskrit || ''));
      console.log(`        -> ${translated.json.sanskrit}`);
    }
  } else {
    console.log('   (no test image on this computer — skipped)');
  }

  // 4. Bad input must be handled politely.
  console.log('\n4. Empty text');
  const empty = await call('/api/translate', { text: '   ' });
  check('empty text is refused politely', empty.status === 400, String(empty.status));

  console.log(`\n${passed} passed, ${failed} failed.\n`);
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error('\nCould not reach the server:', error.message);
  process.exitCode = 1;
});