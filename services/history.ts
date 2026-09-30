/**
 * Translation history stored on the device (AsyncStorage).
 *
 * A tiny store with subscribers so the History tab and the open translation
 * stay in sync no matter which screen made the change.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { MAX_HISTORY_ITEMS } from '@/constants/config';
import type { TranslationResult } from '@/types';

const KEY = '@sanskrit_translator/history/v1';

type Listener = () => void;

let cache: TranslationResult[] | null = null;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

async function persist() {
  cache = (cache ?? []).slice(0, MAX_HISTORY_ITEMS);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Ignore: history is a convenience, not critical.
  }
}

export const historyStore = {
  /** Reads history once and keeps it in memory. */
  async load(): Promise<TranslationResult[]> {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as TranslationResult[]) : [];
      cache = Array.isArray(parsed) ? parsed : [];
    } catch {
      cache = [];
    }
    emit();
    return cache;
  },

  getAll(): TranslationResult[] {
    return cache ?? [];
  },

  getById(id: string): TranslationResult | undefined {
    return (cache ?? []).find((item) => item.id === id);
  },

  /**
   * Newest first. If the very last translation has the same text we simply
   * refresh it, so live scanning never fills the list with duplicates.
   */
  async add(item: TranslationResult): Promise<void> {
    if (!cache) await historyStore.load();
    const current = cache ?? [];
    const newest = current[0];
    const same = newest && newest.originalText === item.originalText;

    cache = same
      ? [item, ...current.slice(1)]
      : [item, ...current];

    emit();
    await persist();
  },

  async remove(id: string): Promise<void> {
    cache = (cache ?? []).filter((item) => item.id !== id);
    emit();
    await persist();
  },

  async clear(): Promise<void> {
    cache = [];
    emit();
    await persist();
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};