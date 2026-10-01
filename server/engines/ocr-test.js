/**
 * Check that the free photo reader really reads a photo.
 *   node engines/ocr-test.js <image.png>
 */

const fs = require('node:fs');
const path = require('node:path');

const { recognize, freeOcrAvailable, LANGUAGES } = require('./ocrFree');

async function main() {
  const file = process.argv[2] || path.join(os.tmpdir(), 'ocr-test.png');
  console.log('tesseract.js installed:', freeOcrAvailable());
  console.log('languages:', LANGUAGES.join(' + '));

  if (!fs.existsSync(file)) {
    console.log('no test image at', file);
    return;
  }

  const started = Date.now();
  const result = await recognize(fs.readFileSync(file).toString('base64'));
  console.log(`read in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  console.log('cleaned text:', JSON.stringify(result.text));
}

main().catch((error) => {
  console.error('FAILED:', error.message);
  process.exitCode = 1;
});