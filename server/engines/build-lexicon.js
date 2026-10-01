/**
 * Grows the Sanskrit dictionary automatically, from open data and free
 * services. No key, no account, no cost.
 *
 *   node engines/build-lexicon.js --probe      # try 10 words, print the result
 *   node engines/build-lexicon.js              # build the file (default 400 words)
 *   node engines/build-lexicon.js --limit 800  # learn more words
 *
 * Where the words come from
 *   1. Open data    — word lists read from Wiktionary's own categories
 *                    (free MediaWiki API, openly licensed content).
 *   2. Free services — the same keyless endpoints the running server already
 *                    uses (Google's public translate endpoint and MyMemory)
 *                    turn each English word into Devanagari.
 *
 * What it refuses to do
 *   - It only keeps results that are really Devanagari, at most three words
 *     long, and different from the input.
 *   - It never overwrites a hand-written entry: the generated file is merged
 *     first and the curated dictionary is applied on top.
 *   - Nothing is invented. A word it cannot translate is simply not learned.
 *
 * The result is written to engines/lexicon.generated.json and committed, so the
 * server never needs the internet for this.
 */

const fs = require('node:fs');
const path = require('node:path');

const { translateAll } = require('./webEngine');
const { toLatinKey } = require('./translit');
const { WORDS, PHRASES } = require('./lexicon');

const WIKTIONARY_API = 'https://en.wiktionary.org/w/api.php';
/** A public frequency list of the most common English words (open data). */
const FREQUENCY_LIST =
  'https://raw.githubusercontent.com/first20hours/google-10000-english/master/20k.txt';
const USER_AGENT = 'SanskritTranslator/1.0 (open-data dictionary build)';
const OUTPUT = path.join(__dirname, 'lexicon.generated.json');
const TIMEOUT_MS = 25_000;

const probe = process.argv.includes('--probe');
const limitFlag = process.argv.indexOf('--limit');
const LIMIT = probe ? 10 : limitFlag > -1 ? Number(process.argv[limitFlag + 1]) || 400 : 400;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Only accept a result we are sure is Sanskrit. */
function cleanCandidate(text, original) {
  const value = String(text || '').trim().replace(/\s+/g, ' ');
  if (!value || value.toLowerCase() === original.toLowerCase()) return null;
  if (value.split(' ').length > 3) return null;
  if (value.length > 28) return null;
  // Devanagari letters, plus only the punctuation Sanskrit really uses.
  if (!/^[\u0900-\u097F\s\u0964\u0965.,?!'"()\-]+$/.test(value)) return null;
  if (!/[\u0900-\u097F]/.test(value)) return null;
  return value;
}

/**
 * A service will happily "translate" an unknown word by just spelling it out
 * in Devanagari (aaa -> आआ). That is not a translation, so it is rejected:
 * if reading the Devanagari back as Latin gives the same letters, skip it.
 */
function looksLikeTransliteration(word, sanskrit) {
  const back = toLatinKey(sanskrit);
  if (back.length < 3) return false;

  const input = word.toLowerCase();
  if (back === input) return true;

  return back.startsWith(input.slice(0, 3));
}

/** Open data: the most common English words, most common first. */
async function frequencyWords(wanted) {
  try {
    const response = await fetch(FREQUENCY_LIST, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return [];

    const words = (await response.text())
      .split('\n')
      .map((line) => line.trim().toLowerCase())
      .filter((word) => /^[a-z]{2,}$/.test(word));

    return words.slice(0, wanted);
  } catch {
    return [];
  }
}

/** Open data: English headwords taken from Wiktionary's own categories. */
async function wiktionaryWords(categories, wanted) {
  const found = new Set();

  for (const category of categories) {
    let continueToken = null;

    do {
      const url =
        `${WIKTIONARY_API}?action=query&format=json&list=categorymembers` +
        `&cmtitle=${encodeURIComponent(category)}&cmtype=page&cmlimit=500` +
        (continueToken ? `&cmcontinue=${encodeURIComponent(continueToken)}` : '');

      let json;
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': USER_AGENT },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!response.ok) break;
        json = await response.json();
      } catch {
        break;
      }

      for (const member of json?.query?.categorymembers || []) {
        const title = String(member.title || '');
        // A plain English word: one lowercase letter-run and nothing else.
        if (/^[a-z]{3,}$/.test(title)) found.add(title);
      }

      continueToken = json?.continue?.cmcontinue || null;
    } while (continueToken && found.size < wanted);

    if (found.size >= wanted) break;
    await sleep(200);
  }

  return [...found];
}

/** Already known words are skipped: the hand-written ones are better. */
function knownWords() {
  const known = new Set(Object.keys(WORDS));
  for (const phrase of Object.keys(PHRASES)) known.add(phrase.split(' ')[0]);
  return known;
}

/**
 * English function words that have no single Sanskrit equivalent.
 *
 * Left to the free services these come back as random compounds ("by" became a
 * nonsense word), so they are never learned. Most are already in the curated
 * dictionary with a proper translation.
 */
const STOP_WORDS = new Set(
  `by as at on in to of it is are was were be been being am do does did have has had
   will would shall should can could may might must or if but so than then that this
   these those he she they we you i him her them us me my your our their who what which
   when where why how not no yes up out down over under again very more most much many
   few some any all both each other such own too also just only even still from into
   about after before between above below during through until against among with
   without for per upon about into onto off along around across behind beyond via
   let lets get gets got go goes going went come comes coming came say says said
   see sees saw seen know knows knew known take takes took given give gives gave
   make makes made made take taken use uses used using one two three four five six
   seven eight nine ten first second third new old good bad big small large little
   long short high low here there now then always never often sometimes again
   able need needs needed want wants wanted like likes liked well better best
   way ways time times day days year years thing things lot lots bit way`
    .split(/\s+/)
    .filter(Boolean),
);

/** Ask the free services, using exactly the code the server already runs. */
async function translateWord(word) {
  const result = await translateAll(word, 'en', 'sa', ['mymemory', 'google']);
  const cleaned = cleanCandidate(result, word);
  if (!cleaned || looksLikeTransliteration(word, cleaned)) return null;
  return cleaned;
}

async function main() {
  console.log(`Learning Sanskrit from open data — up to ${LIMIT} new words${probe ? ' (probe)' : ''}.\n`);

  // Most common English words first; Wiktionary categories if the list is
  // unreachable.
  let candidates = await frequencyWords(probe ? 40 : LIMIT * 3);
  let source = 'the public frequency list';

  if (candidates.length < LIMIT) {
    const extra = await wiktionaryWords(
      ['Category:English_nouns', 'Category:English_verbs', 'Category:English_adjectives'],
      probe ? 40 : LIMIT * 2,
    );
    candidates = [...new Set([...candidates, ...extra])];
    source = 'the frequency list and Wiktionary categories';
  }

  console.log(`Open data (${source}) gave ${candidates.length} candidate words.`);

  const known = knownWords();
  const todo = candidates
    .filter((word) => !known.has(word) && !STOP_WORDS.has(word))
    .slice(0, LIMIT);

  console.log(`Skipping ${candidates.length - todo.length} we already know; learning ${todo.length}.\n`);

  const learned = {};
  const CONCURRENCY = 4;

  for (let index = 0; index < todo.length; index += CONCURRENCY) {
    const slice = todo.slice(index, index + CONCURRENCY);
    const results = await Promise.all(
      slice.map(async (word) => [word, await translateWord(word)]),
    );

    for (const [word, sanskrit] of results) {
      if (sanskrit) learned[word] = sanskrit;
      if (probe) console.log(`  ${word.padEnd(14)} -> ${sanskrit || '(not learned)'}`);
    }

    await sleep(150);
    if (!probe && index && index % 100 === 0) {
      const count = Object.keys(learned).length;
      console.log(`  ${index}/${todo.length} looked up — ${count} learned so far…`);
    }
  }

  console.log(`\nLearned ${Object.keys(learned).length} new English -> Sanskrit words.`);
  if (probe) return;

  if (!Object.keys(learned).length) {
    console.log('Nothing was learned — the file was left untouched.');
    return;
  }

  const payload = {
    builtFrom: ['Wiktionary word lists', 'Google public translate', 'MyMemory'],
    builtAt: new Date().toISOString(),
    words: learned,
  };

  fs.writeFileSync(OUTPUT, `${JSON.stringify(payload, null, 1)}\n`, 'utf8');
  console.log(`Saved ${OUTPUT}`);
}

main().catch((error) => {
  console.error('Build failed:', error.message);
  process.exitCode = 1;
});