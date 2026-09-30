/**
 * Translation service: device cache -> backend proxy -> device cache.
 */

import { ApiError } from '@/utils/errors';
import type {
  CachedTranslation,
  TranslationResult,
  TranslationSource,
} from '@/types';
import { MAX_TEXT_LENGTH, TRANSLATE_TIMEOUT_MS } from '@/constants/config';
import { createId } from '@/utils/hash';
import { postJson } from './api';
import { readCachedTranslation, writeCachedTranslation } from './cache';

type TranslateResponse = {
  sanskrit: string;
  detectedLanguage: string;
  detectedCode: string;
  verified: boolean;
  backTranslation?: string;
  cached?: boolean;
};

export async function translateText(
  rawText: string,
  source: TranslationSource,
): Promise<TranslationResult> {
  const text = rawText.replace(/\s+$/g, '').trim();
  if (!text) throw new ApiError('empty', 400);

  const cached = await readCachedTranslation(text);
  if (cached) {
    return { ...cached, id: createId(), createdAt: Date.now(), source };
  }

  const payload = { text: text.slice(0, MAX_TEXT_LENGTH) };
  const data = await postJson<TranslateResponse>(
    '/api/translate',
    payload,
    TRANSLATE_TIMEOUT_MS,
  );

  const entry: CachedTranslation = {
    originalText: payload.text,
    sanskrit: data.sanskrit,
    detectedLanguage: data.detectedLanguage,
    detectedCode: data.detectedCode,
    verified: data.verified,
    backTranslation: data.backTranslation,
  };

  await writeCachedTranslation(entry);

  return { ...entry, id: createId(), createdAt: Date.now(), source };
}