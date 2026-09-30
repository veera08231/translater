/**
 * Thin fetch wrapper.
 *
 * The app never talks to the AI provider directly — only to our own backend,
 * which holds the API key. Everything that can go wrong is converted into an
 * ApiError with a small, user-friendly code.
 */

import { API_BASE_URL } from '@/constants/config';
import { ApiError, type ApiErrorCode } from '@/utils/errors';

const SERVER_ERROR_CODES: Record<number, ApiErrorCode> = {
  400: 'unclear',
  401: 'not_configured',
  403: 'not_configured',
  404: 'unknown',
  408: 'timeout',
  429: 'too_many',
};

/**
 * Wakes a sleeping host.
 *
 * Free hosting (Render's `free` plan) puts the service to sleep after a few
 * minutes with no traffic, so the next request has to wait for it to start
 * again. Asking for the cheap /health endpoint as soon as the app opens keeps
 * the server awake and costs nothing.
 */
export async function warmUp(): Promise<void> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    await fetch(`${API_BASE_URL}/api/health`, { signal: controller.signal }).finally(() =>
      clearTimeout(timer),
    );
  } catch {
    // The app works fine without it — the first translate just waits longer.
  }
}

/** What the backend can do. The app uses this to stay honest. */
export type BackendInfo = {
  ok: boolean;
  translateEngine: 'free' | 'llm';
  /** null = still checking. */
  ocrAvailable: boolean | null;
  apiKeyConfigured?: boolean;
};

/**
 * Asks the backend what it can do (free / photo reading), so the app never
 * offers a button that cannot work. Fails silently when offline.
 */
export async function getHealth(): Promise<BackendInfo> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!response.ok) throw new Error('offline');
    return (await response.json()) as BackendInfo;
  } catch {
    // Assume nothing is available until the backend says otherwise, so the app
    // never offers a button that cannot work.
    return { ok: false, translateEngine: 'free', ocrAvailable: false };
  }
}

export async function postJson<T>(
  path: string,
  body: unknown,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    const timedOut = (error as Error)?.name === 'AbortError';
    throw new ApiError(timedOut ? 'timeout' : 'offline');
  } finally {
    clearTimeout(timer);
  }

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    code?: ApiErrorCode;
  } | null;

  if (!response.ok) {
    const code = payload?.code ?? SERVER_ERROR_CODES[response.status] ?? 'server';
    throw new ApiError(code, response.status, payload?.error);
  }

  return payload as T;
}