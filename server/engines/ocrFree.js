/**
 * Free photo OCR with Tesseract.js — no API key, no account, no cost.
 *
 * This is what makes the Scan tab work without paying for anything: the photo
 * is read here, on the server, and the words are then cleaned and translated by
 * the same free translator the rest of the app uses.
 *
 * Notes
 *  - The OCR engine is started once and reused, because starting it costs
 *    several seconds.
 *  - One photo at a time, so a slow server cannot run out of memory.
 *  - The language list can be changed with OCR_LANGUAGES (default eng+hin+tam).
 *  - Trained data is downloaded once into a cache folder.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { cleanOcrText } = require('../cleanOcr');

const LANGUAGES = (process.env.OCR_LANGUAGES || 'eng+hin+tam').split('+').filter(Boolean);
const CACHE_PATH = process.env.OCR_CACHE_PATH || path.join(os.tmpdir(), 'sanskrit-ocr-cache');
const TIMEOUT_MS = Number(process.env.OCR_TIMEOUT_MS || 150_000);

/**
 * Below this confidence the "words" are noise, not text. Showing them would
 * fill the screen with rubbish, so we say nothing was found instead.
 */
const MIN_CONFIDENCE = Number(process.env.OCR_MIN_CONFIDENCE || 55);

let workerPromise = null;
let queue = Promise.resolve();
let lastError = null;

/** Is the free reader installed? (True when tesseract.js is available.) */
function freeOcrAvailable() {
  try {
    require.resolve('tesseract.js');
    return true;
  } catch {
    return false;
  }
}

async function getWorker() {
  if (!workerPromise) {
    fs.mkdirSync(CACHE_PATH, { recursive: true });
    workerPromise = require('tesseract.js')
      .createWorker(LANGUAGES.join('+'), 1, {
        cachePath: CACHE_PATH,
        logger: () => {},
        errorHandler: () => {},
      })
      .catch((error) => {
        workerPromise = null;
        lastError = String((error && error.message) || error);
        throw error;
      });
  }
  return workerPromise;
}

/** Start the engine now so the first photo is not slower than the rest. */
function warmUp() {
  if (!freeOcrAvailable()) return;
  getWorker().catch(() => {
    // It will be retried on the first real request.
  });
}

function withTimeout(promise, ms, message) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

/**
 * Reads the text in a base64 image.
 * @param {string} base64
 * @returns {Promise<{ rawText: string, text: string, engine: string }>}
 */
async function recognize(base64) {
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) throw new Error('empty image');

  const run = async () => {
    const worker = await getWorker();
    const { data } = await worker.recognize(buffer);

    // Tesseract often "reads" a blurry frame as random letters. Only trust it
    // when it is reasonably sure.
    const confidence = Number(data?.confidence ?? 0);
    if (confidence < MIN_CONFIDENCE) {
      throw new Error('no text found');
    }

    return data?.text || '';
  };

  // Queue: only one photo is read at a time.
  const job = queue.then(run, run);
  queue = job.then(
    () => undefined,
    () => undefined,
  );

  const raw = await withTimeout(job, TIMEOUT_MS, 'OCR took too long');
  const text = cleanOcrText(raw);

  if (!text) throw new Error('no text found in the photo');

  return { rawText: raw.trim(), text, engine: 'tesseract' };
}

module.exports = {
  recognize,
  freeOcrAvailable,
  warmUp,
  LANGUAGES,
  /** Ready when the photo reader finished starting up. */
  isReady: () => Boolean(workerPromise),
  /** Why the reader is not working, if we know. */
  lastError: () => lastError,
};