/**
 * A tiny in-memory cache.
 *
 * Same input -> same answer, always. With temperature 0 the model is
 * deterministic anyway; the cache guarantees it and saves money.
 */

const crypto = require('node:crypto');

const MAX_ENTRIES = 1000;
const store = new Map();

function keyOf(parts) {
  return crypto.createHash('sha256').update(parts.join('\u0000')).digest('hex');
}

const cache = {
  get(key) {
    const hit = store.get(key);
    if (!hit) return undefined;
    // Refresh recency.
    store.delete(key);
    store.set(key, hit);
    return hit;
  },

  set(key, value) {
    if (store.has(key)) store.delete(key);
    store.set(key, value);
    while (store.size > MAX_ENTRIES) {
      const oldest = store.keys().next().value;
      store.delete(oldest);
    }
  },

  clear() {
    store.clear();
  },

  get size() {
    return store.size;
  },

  keyOf,
};

module.exports = cache;