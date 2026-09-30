/**
 * On-device translation cache.
 *
 * Same text in, same Sanskrit out — instantly, with no network call.
 * This is what makes the app feel consistent: a cached answer is never
 * different from the answer the model gave the first time.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { MAX_CACHE_ITEMS } from '@/constants/config';
import type { CachedTranslation } from '@/types';
import { hashText } from '@/utils/hash';

const INDEX_KEY = '@sanskrit_translator/cache_index/v1';

const entryKey = (hash: string) => `@sanskrit_translator/cache/${hash}`;

async function readIndex(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function readCachedTranslation(text: string): Promise<CachedTranslation | null> {
  try {
    const raw = await AsyncStorage.getItem(entryKey(hashText(text)));
    return raw ? (JSON.parse(raw) as CachedTranslation) : null;
  } catch {
    return null;
  }
}

export async function writeCachedTranslation(entry: CachedTranslation): Promise<void> {
  try {
    const hash = hashText(entry.originalText);
    await AsyncStorage.setItem(entryKey(hash), JSON.stringify(entry));

    const index = await readIndex();
    const next = index.filter((value) => value !== hash);
    next.push(hash);

    while (next.length > MAX_CACHE_ITEMS) {
      const oldest = next.shift();
      if (oldest) await AsyncStorage.removeItem(entryKey(oldest));
    }

    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(next));
  } catch {
    // A full disk must never break translating.
  }
}