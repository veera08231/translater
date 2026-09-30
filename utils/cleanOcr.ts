/**
 * Cleans raw OCR output before it is translated.
 *
 * Vision models return photo noise: stray brackets, cut-off lines, random
 * single characters, hard-wrapped sentences. This turns that into readable
 * text:
 *  - drops lines that are mostly noise (e.g. "|  |", "---"),
 *  - joins words that were split across two lines,
 *  - keeps a line break only where a sentence or paragraph really ends,
 *  - collapses repeated spaces and blank lines.
 *
 * Hermes-safe: no Unicode property escapes.
 */

const SENTENCE_END = /[.!?,;:]|\u0964|\u0965|\u0966|["'\u201D\u2019)\]]$/;

function isAlnum(code: number): boolean {
  return (
    (code >= 48 && code <= 57) || // 0-9
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) || // a-z
    code >= 0x00c0 // every accented letter and every other script
  );
}

function alnumRatio(line: string): number {
  if (!line.length) return 0;
  let good = 0;
  for (const ch of line) {
    const code = ch.codePointAt(0) ?? 0;
    if (isAlnum(code)) good += 1;
  }
  return good / line.length;
}

export function cleanOcrText(raw: string): string {
  if (!raw) return '';

  const normalised = raw
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');

  const rawLines = normalised.split('\n').map((line) => line.replace(/[ \t]+/g, ' ').trim());

  // 1. Remove noise lines and remember where paragraphs were.
  const kept: string[] = [];
  for (const line of rawLines) {
    if (line === '') {
      if (kept.length && kept[kept.length - 1] !== '') kept.push('');
      continue;
    }
    if (line.length >= 2 && alnumRatio(line) < 0.5) continue; // "|  |", "**", "::::"
    if (line.length === 1 && !isAlnum(line.codePointAt(0) ?? 0)) continue; // lone "|" or "*"
    kept.push(line);
  }
  while (kept.length && kept[kept.length - 1] === '') kept.pop();

  // 2. Re-flow lines that were wrapped by the photo.
  const merged: string[] = [];
  for (const line of kept) {
    if (merged.length === 0) {
      merged.push(line);
      continue;
    }
    const previous = merged[merged.length - 1];

    if (previous === '') {
      merged.push(line);
      continue;
    }
    if (/[A-Za-z\u00C0-\u024F]-$/.test(previous)) {
      // word-broken across lines: "transla-" + "tion"
      merged[merged.length - 1] = `${previous.slice(0, -1)}${line}`;
      continue;
    }
    if (SENTENCE_END.test(previous)) {
      merged.push(line); // real sentence break -> keep the new line
      continue;
    }
    merged[merged.length - 1] = `${previous} ${line}`;
  }

  return merged
    .join('\n')
    .replace(/[ ]{2,}/g, ' ')
    // Keep a single blank line between paragraphs, drop the rest.
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

/**
 * True when two OCR reads are "the same text" (so we do not pay for another
 * translation while the user keeps the camera still).
 */
export function isSameOcrText(a: string, b: string): boolean {
  const normalise = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();
  return normalise(a) === normalise(b);
}