/**
 * OCR clean-up (server side).
 *
 * This is a plain-JavaScript mirror of utils/cleanOcr.ts so the text is
 * cleaned once, before it ever reaches the translation model. The API returns
 * both the raw and the clean text.
 *
 * Hermes-safe: no Unicode property escapes.
 */

const SENTENCE_END = /[.!?,;:]|\u0964|\u0965|\u0966|["'\u201D\u2019)\]]$/;

function isAlnum(code) {
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code >= 0x00c0
  );
}

function alnumRatio(line) {
  if (!line.length) return 0;
  let good = 0;
  for (const ch of line) {
    if (isAlnum(ch.codePointAt(0) || 0)) good += 1;
  }
  return good / line.length;
}

function cleanOcrText(raw) {
  if (!raw) return '';

  const normalised = String(raw)
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');

  const rawLines = normalised.split('\n').map((line) => line.replace(/[ \t]+/g, ' ').trim());

  const kept = [];
  for (const line of rawLines) {
    if (line === '') {
      if (kept.length && kept[kept.length - 1] !== '') kept.push('');
      continue;
    }
    if (line.length >= 2 && alnumRatio(line) < 0.5) continue;
    if (line.length === 1 && !isAlnum(line.codePointAt(0) || 0)) continue;
    kept.push(line);
  }
  while (kept.length && kept[kept.length - 1] === '') kept.pop();

  const merged = [];
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
      merged[merged.length - 1] = `${previous.slice(0, -1)}${line}`;
      continue;
    }
    if (SENTENCE_END.test(previous)) {
      merged.push(line);
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

module.exports = { cleanOcrText };