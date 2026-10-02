/**
 * One place that knows how to translate, how it looks while it works, and what
 * to say when it fails. Screens stay simple because of this hook.
 */

import { useCallback, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';

import type { TranslateState, TranslationSource } from '@/types';
import { translateText } from '@/services/translate';
import { historyStore } from '@/services/history';
import { friendlyErrorMessage } from '@/utils/errors';

const INITIAL: TranslateState = { status: 'idle' };

export function useTranslation(source: TranslationSource = 'typed') {
  const [state, setState] = useState<TranslateState>(INITIAL);
  const [slow, setSlow] = useState(false);
  const requestId = useRef(0);

  const translate = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text) {
        setState({ status: 'error', error: 'Please type or scan some text first.' });
        return;
      }

      const id = requestId.current + 1;
      requestId.current = id;
      setState({ status: 'loading' });

      // A free hosting service sleeps, so the first answer can take a while.
      // Say so, instead of looking frozen.
      setSlow(false);
      const slowTimer = setTimeout(() => setSlow(true), 3_000);

      try {
        const result = await translateText(text, source);
        if (requestId.current !== id) return; // a newer request won
        setState({ status: 'done', result });
        void historyStore.add(result);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        if (requestId.current !== id) return;
        setState({ status: 'error', error: friendlyErrorMessage(error) });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        clearTimeout(slowTimer);
        setSlow(false);
      }
    },
    [source],
  );

  const reset = useCallback(() => {
    requestId.current += 1;
    setState(INITIAL);
  }, []);

  return {
    status: state.status,
    result: state.result,
    error: state.error,
    isLoading: state.status === 'loading',
    /** True when the answer is taking a while (the server may be waking). */
    slow,
    translate,
    reset,
  };
}