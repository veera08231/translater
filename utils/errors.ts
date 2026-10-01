/**
 * Turns low-level failures into messages a normal person can act on.
 */

export type ApiErrorCode =
  | 'offline'
  | 'timeout'
  | 'too_many'
  | 'empty'
  | 'unclear'
  | 'unreadable'
  | 'no_ocr'
  | 'server'
  | 'not_configured'
  | 'unknown';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, status = 0, message?: string) {
    super(message || code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

const MESSAGES: Record<ApiErrorCode, string> = {
  offline: 'No internet. Please connect and try again.',
  timeout: 'This is taking too long. Please try again.',
  too_many: 'Too many requests. Please wait a moment and try again.',
  empty: 'No text found. Please type or scan some text.',
  unclear: 'The text is not clear enough. Please try again with better light.',
  unreadable: 'No text found in that photo. Please try again with better light.',
  no_ocr: 'Reading text from photos is not available here. Please type what you see.',
  server: 'Something went wrong on our side. Please try again.',
  not_configured: 'The translator is not set up yet. Please try again later.',
  unknown: 'Something went wrong. Please try again.',
};

/** Never shows a technical string to the user. */
export function friendlyErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return MESSAGES[error.code] ?? MESSAGES.unknown;
  if (__DEV__ && error instanceof Error && error.message) return error.message;
  return MESSAGES.unknown;
}