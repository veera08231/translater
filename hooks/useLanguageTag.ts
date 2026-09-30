/**
 * Live language tag for the text box.
 *
 * Waits until the user stops typing for a moment, then updates the tag, so the
 * screen never flickers while typing.
 */

import { useEffect, useState } from 'react';

import { detectLanguage, type DetectedLanguage } from '@/utils/detectLanguage';

export function useLanguageTag(text: string, delayMs = 350): DetectedLanguage | null {
  const [language, setLanguage] = useState<DetectedLanguage | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLanguage(detectLanguage(text));
    }, delayMs);

    return () => clearTimeout(timer);
  }, [text, delayMs]);

  return language;
}