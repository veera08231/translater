/**
 * Local backend proxy.
 *
 *   npm run server          ->  http://localhost:3001
 *
 * The mobile app only ever talks to this server. The AI provider key stays
 * here, in the environment.
 */

const express = require('express');
const cors = require('cors');

const config = require('./config');
const cache = require('./cache');
const { handleTranslate, handleOcr } = require('./handlers');
const { ocrAvailable, autoScanAvailable, activeTranslateEngine } = require('./engines');
const { warmUp } = require('./engines/ocrFree');

const app = express();

app.use(cors());
app.use(express.json({ limit: '12mb' }));

// ---------------------------------------------------------------- rate limit
const buckets = new Map();

function rateLimit(req, res, next) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.start > 60_000) {
    buckets.set(key, { start: now, count: 1 });
    return next();
  }

  bucket.count += 1;
  if (bucket.count > config.RATE_LIMIT_PER_MINUTE) {
    return res.status(429).json({ code: 'too_many', error: 'Too many requests.' });
  }

  // Keep the map small.
  if (buckets.size > 5000) buckets.clear();
  return next();
}

// --------------------------------------------------------------------- routes
app.get('/', (_req, res) => {
  // Someone opened the bare address in a browser. Say hello instead of 404.
  res.json({
    ok: true,
    service: 'Sanskrit Translator API',
    translatingWith: activeTranslateEngine() === 'free' ? 'free dictionary (no key)' : config.OPENAI_MODEL,
    readingPhotos: ocrAvailable(),
    try: {
      health: 'GET /api/health',
      translate: 'POST /api/translate  {"text": "hello world"}',
    },
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    // What the app uses to decide whether the Scan tab can read photos.
    translateEngine: activeTranslateEngine(),
    ocrAvailable: ocrAvailable(),
    autoScanAvailable: autoScanAvailable(),
    model: config.OPENAI_MODEL,
    visionModel: config.OPENAI_VISION_MODEL,
    apiKeyConfigured: Boolean(config.OPENAI_API_KEY),
    cachedTranslations: cache.size,
  });
});

app.post('/api/translate', rateLimit, async (req, res) => {
  const { status, body } = await handleTranslate(req.body);
  res.status(status).json(body);
});

app.post('/api/ocr', rateLimit, async (req, res) => {
  const { status, body } = await handleOcr(req.body);
  res.status(status).json(body);
});

app.use((_req, res) => {
  res.status(404).json({
    code: 'unknown',
    error: 'Nothing here. Try /api/health, or POST /api/translate with {"text": "..."}.',
  });
});

// eslint-disable-next-line no-unused-vars
app.use((error, _req, res, _next) => {
  if (error && error.type === 'entity.too.large') {
    return res.status(400).json({ code: 'unclear', error: 'The photo is too large.' });
  }
  res.status(500).json({ code: 'server', error: 'Unexpected server error.' });
});

const fs = require('node:fs');
const path = require('node:path');

const server = app.listen(config.PORT, '0.0.0.0', () => {
  const keyState = config.OPENAI_API_KEY ? 'found' : 'not set';
  const hasEnvFile = fs.existsSync(path.join(__dirname, '.env'));
  /* eslint-disable no-console */
  console.log(`Sanskrit Translator API on http://localhost:${config.PORT}`);
  console.log(`Translating with : ${activeTranslateEngine() === 'free' ? 'free dictionary (no key, no cost)' : config.OPENAI_MODEL}`);
  console.log(`Photo text       : ${ocrAvailable() ? (config.OPENAI_API_KEY ? `yes (${config.OPENAI_VISION_MODEL})` : 'yes (free Tesseract reader)') : 'no — the app will ask the user to type'}`);
  console.log(`API key          : ${keyState}${hasEnvFile ? ' (from server/.env)' : ''}`);

  // Start the photo reader now, so the first scan is not slower than the rest.
  warmUp();
  /* eslint-enable no-console */
});

process.on('SIGINT', () => server.close(() => process.exit(0)));

module.exports = app;