/**
 * History list state, shared between the History tab and the detail modal.
 */

import { useCallback, useEffect, useState } from 'react';

import type { TranslationResult } from '@/types';
import { historyStore } from '@/services/history';

export function useHistory() {
  const [items, setItems] = useState<TranslationResult[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsubscribe = historyStore.subscribe(() => {
      setItems(historyStore.getAll());
    });

    void historyStore.load().then(() => setReady(true));

    return unsubscribe;
  }, []);

  const remove = useCallback((id: string) => historyStore.remove(id), []);
  const clear = useCallback(() => historyStore.clear(), []);
  const refresh = useCallback(() => historyStore.load(), []);

  return { items, ready, remove, clear, refresh };
}