/**
 * Every prompt the app uses. Temperature is always 0 (see llm.js) so the same
 * sentence always produces the same Sanskrit.
 */

/** Exactly the system prompt required for accuracy. */
const TRANSLATE_SYSTEM =
  'You are an expert Sanskrit scholar. Translate the text into correct classical ' +
  'Sanskrit in Devanagari. Keep the exact meaning, names and numbers. Follow proper ' +
  'sandhi, vibhakti, vacana and lakara. Do not add, remove or explain anything. ' +
  'Output only the Sanskrit.';

/**
 * The model also names the source language in the same call, which saves a
 * round trip and keeps the two answers consistent.
 */
function translateUserMessage(text) {
  return (
    `Text:\n"""\n${text}\n"""\n\n` +
    'Answer with exactly two lines and nothing else:\n' +
    'Line 1: the English name of the language of the text (for example: Tamil).\n' +
    'Line 2: the Sanskrit translation in Devanagari.'
  );
}

const BACK_TRANSLATE_SYSTEM =
  'You are a careful translator. Translate the Sanskrit text below into the target ' +
  'language, written in that language\'s native script. Keep the exact meaning, names ' +
  'and numbers. Do not add, remove or explain anything. Output only the translation.';

function backTranslateUserMessage(languageName, sanskrit) {
  return `Target language: ${languageName}\n\nSanskrit:\n"""\n${sanskrit}\n"""`;
}

const JUDGE_SYSTEM =
  'You check translations. You are given the ORIGINAL text and a BACK-TRANSLATION ' +
  'that was produced by translating a Sanskrit version of the original. Decide whether ' +
  'the back-translation means the same as the original. Small differences in wording ' +
  'are fine, but names, numbers and the main meaning must match. Reply with JSON only.';

function judgeUserMessage(original, backTranslation) {
  return (
    `ORIGINAL:\n"""\n${original}\n"""\n\n` +
    `BACK-TRANSLATION:\n"""\n${backTranslation}\n"""\n\n` +
    'Reply with exactly: {"matches": true} or {"matches": false}'
  );
}

const OCR_SYSTEM =
  'You read text from photos. Copy every piece of readable text from the image, in ' +
  'reading order, keeping the original language and script. Keep numbers, names and ' +
  'punctuation. If the image contains no readable text, reply with an empty string. ' +
  'Output only the text.';

module.exports = {
  TRANSLATE_SYSTEM,
  translateUserMessage,
  BACK_TRANSLATE_SYSTEM,
  backTranslateUserMessage,
  JUDGE_SYSTEM,
  judgeUserMessage,
  OCR_SYSTEM,
};