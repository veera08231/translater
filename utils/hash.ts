/**
 * Small, dependency-free string hash used for cache keys.
 * (Not a security hash — it only needs to be fast and stable.)
 */
export function hashText(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;

  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ code, 0x85ebca6b) >>> 0;
  }

  return `${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}`;
}

/** A short unique id for history items. */
export function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}