/**
 * OCR service: sends a photo to our backend, which uses a cloud vision model
 * and returns clean text (noise removed, line breaks fixed).
 */

import { ApiError } from '@/utils/errors';
import type { OcrResult } from '@/types';
import { OCR_TIMEOUT_MS } from '@/constants/config';
import { postJson } from './api';

export async function readTextFromPhoto(
  base64: string,
  mimeType = 'image/jpeg',
): Promise<OcrResult> {
  if (!base64) throw new ApiError('empty', 400);
  return postJson<OcrResult>('/api/ocr', { image: base64, mimeType }, OCR_TIMEOUT_MS);
}