/**
 * App configuration.
 *
 * The API key never lives in the app. The app only knows the *address* of our
 * backend proxy (`EXPO_PUBLIC_*` variables are inlined into the bundle, so only
 * put public values here).
 */

const DEFAULT_API_URL = 'http://localhost:3001';

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL
).replace(/\/+$/, '');

/** Translate + verify can take a while, so we allow a generous timeout. */
export const TRANSLATE_TIMEOUT_MS = 60_000;

/** Vision OCR of a photo. */
export const OCR_TIMEOUT_MS = 45_000;

/** We never send more than this many characters to the model. */
export const MAX_TEXT_LENGTH = 4000;

/** How many translations we keep on the device. */
export const MAX_HISTORY_ITEMS = 200;

/** How many translations we keep in the on-device cache. */
export const MAX_CACHE_ITEMS = 200;

/** Minimum gap between two automatic camera reads while scanning. */
export const AUTO_SCAN_INTERVAL_MS = 4500;