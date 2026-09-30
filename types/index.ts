/**
 * Shared app-wide types.
 */

export type TranslationSource = 'typed' | 'scanned';

/**
 * Which translator produced the answer.
 * - 'free': our bundled Sanskrit dictionary (always available, no key)
 * - 'web':  a free online translation service (used when the dictionary is unsure)
 * - 'llm':  an AI model, when OPENAI_API_KEY is set
 */
export type TranslationEngine = 'free' | 'web' | 'llm';

export type TranslationResult = {
  /** Stable local id (history key). */
  id: string;
  /** The text the user typed or that we read from the camera. */
  originalText: string;
  /** The Sanskrit translation, in Devanagari. */
  sanskrit: string;
  /** Human readable language name, e.g. "Tamil". */
  detectedLanguage: string;
  /** ISO code of the detected language, e.g. "ta". */
  detectedCode: string;
  /** False when the back-translation check did not match. */
  verified: boolean;
  /**
   * 'free' = bundled dictionary (no key, word-by-word).
   * 'web'  = a free online service.
   * 'llm'  = an AI model (full grammar).
   */
  engine?: TranslationEngine;
  /** Free engine only: how many percent of the words it knew (0-100). */
  coverage?: number;
  /** Back-translation used for the check (kept for debugging / trust). */
  backTranslation?: string;
  /** Where the text came from. */
  source: TranslationSource;
  /** Epoch milliseconds. */
  createdAt: number;
};

export type TranslateStatus = 'idle' | 'loading' | 'done' | 'error';

export type TranslateState = {
  status: TranslateStatus;
  result?: TranslationResult;
  error?: string;
};

/** Cached payload (everything except the local bookkeeping fields). */
export type CachedTranslation = {
  originalText: string;
  sanskrit: string;
  detectedLanguage: string;
  detectedCode: string;
  verified: boolean;
  backTranslation?: string;
  /** Which engine produced it, so the app can explain itself after a reload. */
  engine?: 'free' | 'llm';
  coverage?: number;
};

export type OcrResult = {
  /** Text exactly as the vision model returned it. */
  rawText: string;
  /** Noise-free, line-broken text that is safe to translate. */
  text: string;
};