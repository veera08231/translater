const config = require('../config');
const { freeOcrAvailable } = require('./ocrFree');

/** True when photos can be read: by the AI model, or by the free reader. */
function ocrAvailable() {
  if (config.OCR_ENGINE === 'off') return false;
  if (llmAvailable()) return true;
  return freeOcrAvailable();
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

/**
 * Live automatic scanning is only worth it with a fast model behind it, so it
 * is switched on only when an AI key is present.
 */
function autoScanAvailable() {
  return llmAvailable();
}

module.exports = {
  ocrAvailable,
  llmAvailable,
  autoScanAvailable,
  activeTranslateEngine,
};