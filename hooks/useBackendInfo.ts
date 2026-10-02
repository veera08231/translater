/**
 * What the backend can do, asked once and shared by every screen.
 *
 * The app uses this so it never offers a button that cannot work — for
 * example photo reading needs an online reader, which the free setup has not.
 */

import { useCallback, useEffect, useState } from 'react';

import { getHealth, type BackendInfo } from '@/services/api';

/** null = still checking. */
const PENDING: BackendInfo = {
  ok: false,
  translateEngine: 'free',
  ocrAvailable: null,
  host: '',
};

let stored: BackendInfo | null = null;
let request: Promise<BackendInfo> | null = null;

function ask(): Promise<BackendInfo> {
  if (!request) {
    request = getHealth().finally(() => {
      request = null;
    });
  }
  return request;
}

export function useBackendInfo(): BackendInfo & { refresh: () => void } {
  const [info, setInfo] = useState<BackendInfo>(() => stored ?? PENDING);

  useEffect(() => {
    if (stored) return;

    let alive = true;
    void ask().then((value) => {
      stored = value;
      if (alive) setInfo(value);
    });

    return () => {
      alive = false;
    };
  }, []);

  const refresh = useCallback(() => {
    void ask().then((value) => {
      stored = value;
      setInfo(value);
    });
  }, []);

  return { ...info, refresh };
}