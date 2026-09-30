/**
 * Word helpers for the free translation engine.
 *
 * The free engine has no AI model, so it recognises words by sound and by
 * meaning: Devanagari is converted to a plain Latin form and matched against
 * the bundled Sanskrit dictionary. Anything it does not recognise is passed
 * through unchanged, which is honest — we never invent a Sanskrit word.
 */

const DEVANAGARI_TO_LATIN = {
  // vowels (independent)
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u',
  'ऊ': 'oo', 'ऋ': 'ri', 'ॠ': 'ri', 'ए': 'e', 'ऐ': 'ai',
  'ओ': 'o', 'औ': 'au', 'ऑ': 'o', 'ऍ': 'e',
  // matras (vowel signs)
  'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
  'ृ': 'ri', 'ॄ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o',
  'ौ': 'au', 'ॉ': 'o', 'ॅ': 'e',
  // consonants
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'न्': 'n', 'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh',
  'म': 'm', 'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v',
  'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'ळ': 'l', 'ऴ': 'zh', 'ऱ': 'r', 'ऩ': 'n',
  // marks that add nothing to a search key
  '्': '', 'ं': 'n', 'ँ': 'n', 'ः': 'h', 'ऽ': '',
  '़': '', '॒': '', '॑': '', '।': ' ', '॥': ' ',
  'ॐ': 'om', 'ॐ': 'om', '‌': '', '‍': '',
};

/** Script ranges, used to guess which language a word is written in. */
const SCRIPT_TESTS = [
  { code: 'hi', name: 'Hindi', re: /[\u0900-\u097F]/ },
  { code: 'bn', name: 'Bengali', re: /[\u0980-\u09FF]/ },
  { code: 'pa', name: 'Punjabi', re: /[\u0A00-\u0A7F]/ },
  { code: 'gu', name: 'Gujarati', re: /[\u0A80-\u0AFF]/ },
  { code: 'or', name: 'Odia', re: /[\u0B00-\u0B7F]/ },
  { code: 'ta', name: 'Tamil', re: /[\u0B80-\u0BFF]/ },
  { code: 'te', name: 'Telugu', re: /[\u0C00-\u0C7F]/ },
  { code: 'kn', name: 'Kannada', re: /[\u0C80-\u0CFF]/ },
  { code: 'ml', name: 'Malayalam', re: /[\u0D00-\u0D7F]/ },
  { code: 'si', name: 'Sinhala', re: /[\u0D80-\u0DFF]/ },
  { code: 'th', name: 'Thai', re: /[\u0E00-\u0E7F]/ },
  { code: 'zh', name: 'Chinese', re: /[\u4E00-\u9FFF]/ },
  { code: 'ja', name: 'Japanese', re: /[\u3040-\u30FF]/ },
  { code: 'ko', name: 'Korean', re: /[\uAC00-\uD7A3]/ },
  { code: 'ar', name: 'Arabic', re: /[\u0600-\u06FF]/ },
  { code: 'ru', name: 'Russian', re: /[\u0400-\u04FF]/ },
  { code: 'el', name: 'Greek', re: /[\u0370-\u03FF]/ },
];

/** Splits any script into words we can look up. */
function tokenize(text) {
  return String(text)
    .split(/[\s\u0964\u0965,.;:!?"'()\[\]{}<>।॥]+/)
    .filter(Boolean);
}

/** Devanagari (and friends) -> plain lowercase Latin. */
function toLatinKey(word) {
  if (!/[\u0900-\u097F]/.test(word)) {
    return word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  }

  let out = '';
  for (const ch of word) {
    out += DEVANAGARI_TO_LATIN[ch] !== undefined ? DEVANAGARI_TO_LATIN[ch] : ch;
  }

  return out
    .toLowerCase()
    .replace(/([a-z])\1+/g, '$1') // virama collapses doubled letters
    .replace(/[^a-z]/g, '');
}

/** Small, forgiving stemming so "running" still finds "run". */
function stemsOf(word) {
  const forms = [word];
  const suffixes = ['ing', 'ed', 'es', 's', 'er', 'est'];
  for (const suffix of suffixes) {
    if (word.length >= suffix.length + 2 && word.endsWith(suffix)) {
      forms.push(word.slice(0, -suffix.length));
    }
  }
  const irregular = {
    children: 'child', men: 'man', women: 'woman', feet: 'foot',
    teeth: 'tooth', went: 'go', gone: 'go', doing: 'do', goes: 'go',
    is: 'be', am: 'be', are: 'be',
  };
  if (irregular[word]) forms.push(irregular[word]);
  return forms;
}

/** Numbers 0-100 in Sanskrit. */
const NUMBER_SANSKRIT = [
  'शून्यम्', 'एकम्', 'द्वि', 'त्रि', 'चत्वारि', 'पञ्च', 'षट्', 'सप्त',
  'अष्ट', 'नव', 'दश', 'एकादश', 'द्वादश', 'त्रयोदश', 'चतुर्दश', 'पञ्चदश',
  'षोडश', 'सप्तदश', 'अष्टादश', 'एकोनविंशतिः', 'विंशतिः',
  'एकविंशतिः', 'द्वाविंशतिः', 'त्रयोविंशतिः', 'चतुर्विंशतिः', 'पञ्चविंशतिः',
  'षड्विंशतिः', 'सप्तविंशतिः', 'अष्टाविंशतिः', 'एकोनत्रिंशतः', 'त्रिंशत्',
  'एकत्रिंशत्', 'द्वात्रिंशत्', 'त्रयत्रिंशत्', 'चतुत्रिंशत्', 'पञ्चत्रिंशत्',
  'षत्त्रिंशत्', 'सप्तत्रिंशत्', 'अष्टात्रिंशत्', 'एकोनचत्वारिंशतः', 'चत्वारिंशत्',
  'एकचत्वारिंशत्', 'द्विचत्वारिंशत्', 'त्रिचत्वारिंशत्', 'चतुर्चत्वारिंशत्', 'पञ्चचत्वारिंशत्',
  'षच्चत्वारिंशत्', 'सप्तचत्वारिंशत्', 'अष्टाचत्वारिंशत्', 'एकोनपञ्चाशत्', 'पञ्चाशत्',
  'एकपञ्चाशत्', 'द्विपञ्चाशत्', 'त्रिपञ्चाशत्', 'चतुःपञ्चाशत्', 'पञ्चपञ्चाशत्',
  'षट्पञ्चाशत्', 'सप्तपञ्चाशत्', 'अष्टापञ्चाशत्', 'एकोनषष्टिः', 'षष्टिः',
  'एकषष्टिः', 'द्विषष्टिः', 'त्रिषष्टिः', 'चतुःषष्टिः', 'पञ्चषष्टिः',
  'षट्षष्टिः', 'सप्तषष्टिः', 'अष्टाषष्टिः', 'एकोनसप्ततिः', 'सप्ततिः',
  'एकसप्ततिः', 'द्विसप्ततिः', 'त्रिसप्ततिः', 'चतुःसप्ततिः', 'पञ्चसप्ततिः',
  'षट्सप्ततिः', 'सप्तसप्ततिः', 'अष्टासप्ततिः', 'एकोनशतम्', 'शतम्',
];

function numberToSanskrit(value) {
  if (!Number.isFinite(value) || value < 0) return null;
  if (value <= 100) return NUMBER_SANSKRIT[value];
  const hundred = Math.floor(value / 100);
  const rest = value % 100;
  const parts = [];
  if (hundred > 0) parts.push(`${NUMBER_SANSKRIT[hundred] || 'शतम्'} शतम्`);
  if (rest > 0) parts.push(NUMBER_SANSKRIT[rest]);
  return parts.length ? parts.join(' ') : null;
}

module.exports = {
  tokenize,
  toLatinKey,
  stemsOf,
  numberToSanskrit,
  SCRIPT_TESTS,
};