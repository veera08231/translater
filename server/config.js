/**
 * Backend configuration. Everything secret lives here — never in the app.
 */

const path = require('node:path');

// server/.env wins, then the project .env
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const config = {
  PORT: Number(process.env.PORT || 3001),

  /**
   * 'free'  = bundled Sanskrit dictionary. No key, no cost. (default)
   * 'llm'   = an AI model. Best grammar, needs a key (or a local Ollama).
   */
  TRANSLATE_ENGINE: (process.env.TRANSLATE_ENGINE || 'free').toLowerCase(),

  /**
   * Reading text from photos needs an online vision model, so it is only
   * switched on when a key is present.
   * 'auto' = on when OPENAI_API_KEY is set, otherwise off.
   */
  OCR_ENGINE: (process.env.OCR_ENGINE || 'auto').toLowerCase(),

  /**
   * Set to false to use only the bundled dictionary and never call the free
   * online translation services.
   */
  USE_FREE_APIS: process.env.USE_FREE_APIS !== 'false',

  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  /** Change this to use any OpenAI-compatible provider or a local gateway. */
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  /** Text model used for translating and for the verification pass. */
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o',
  /** Vision model used to read text from photos. */
  OPENAI_VISION_MODEL: process.env.OPENAI_VISION_MODEL || 'gpt-4o',

  MAX_TEXT_LENGTH: Number(process.env.MAX_TEXT_LENGTH || 4000),
  MAX_IMAGE_BYTES: Number(process.env.MAX_IMAGE_BYTES || 8 * 1024 * 1024),
  /** Simple protection so one client cannot spend the whole key. */
  RATE_LIMIT_PER_MINUTE: Number(process.env.RATE_LIMIT_PER_MINUTE || 40),
};

module.exports = config;