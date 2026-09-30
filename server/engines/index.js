const config = require('../config');

/** True when photos can be read (needs an online vision model). */
function ocrAvailable() {
  if (config.OCR_ENGINE === 'off') return false;
  return Boolean(config.OPENAI_API_KEY);
}

/** True when the AI translation engine can actually run. */
function llmAvailable() {
  return Boolean(config.OPENAI_API_KEY);
}

/** The engine a request will actually use, after the availability check. */
function activeTranslateEngine() {
  if (config.TRANSLATE_ENGINE === 'llm' && llmAvailable()) return 'llm';
  return 'free';
}

module.exports = { ocrAvailable, llmAvailable, activeTranslateEngine };