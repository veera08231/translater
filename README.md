# Sanskrit Translator

**Any language → Sanskrit, for free. No API key, no account, no monthly bill.**

| Type | Scan | History |
| ---- | ---- | ------- |
| Type or paste text in any language | Point the camera at text | Every translation you made |

Three screens, one button each, big text. Nothing to learn.

---

## How the free translation works

There is no AI key, so the server translates in three steps, cheapest first:

```
your text
   │
   1. OUR SANSKRIT DICTIONARY  (server/engines/lexicon.js)
   │    ~2,100 entries: English + Tamil, Telugu, Kannada, Bengali, Gujarati,
   │    Malayalam, Hindi and romanised spellings ("paani", "thanni")
   │    • phrases first      "thank you" → धन्यवादः
   │    • verbs conjugated   "I go"      → अहं गच्छामि   (not गच्छति)
   │    • numbers written    "4 people"  → चत्वारि जनाः
   │    • words Sanskrit does not need (the, a, of) are dropped, not faked
   │    Words it does not know are passed through unchanged — it never invents one.
   │
   2. FREE ONLINE SERVICES  (server/engines/webEngine.js)
   │    only when step 1 knows less than 60% of the sentence
   │    • source → English (Google's public endpoint, then MyMemory)
   │    • English → Sanskrit with our own dictionary  ← best classical quality
   │    • if that is still weak: source → Sanskrit directly
   │    No key, no account. A result that is not Devanagari is thrown away.
   │
   3. AI MODEL  (optional)
        only if you add OPENAI_API_KEY one day — best grammar, and it
        verifies itself by back-translating
```

Tested working for English, Tamil, Hindi, Telugu, Kannada, Bengali, Gujarati,
Malayalam, French, German, Spanish, Portuguese, Italian, Dutch, Turkish,
Vietnamese, Indonesian, Polish, Russian, Japanese, Chinese, Korean, Arabic,
Thai, and romanised spellings of the Indian languages.

### The dictionary grows by itself

```bash
npm run learn:more            # learn 1,500 more words (free, takes a few minutes)
npm run learn:more -- --probe # look at what it would learn, learn nothing
```

`server/engines/build-lexicon.js` takes the most common English words from a
**public frequency list** and asks the **same free services** the app already
uses for their Devanagari. What passes the checks is written to
`lexicon.generated.json` and committed, so the server never needs the internet
for this. It refuses to learn junk:

- the result must be real Devanagari, at most three words long
- a result that is only the input spelled out in Devanagari is thrown away
- English function words (`by`, `as`, `of`…) are skipped — they have no single
  Sanskrit equivalent and come back as nonsense
- **hand-written entries always win** — learned words only fill the gaps

It learned **419 words** on the last run, taking the dictionary from 558 to **977
English words**, e.g. `page` → पृष्ठम्, `search` → अन्वेषणम्, `information` →
सूचना. Review `server/engines/lexicon.generated.json` like any other file —
delete anything you do not like and commit.

---

## 1. What you need

| | |
| --- | --- |
| **Node.js** | 20.19+ or 22.13+ ([nodejs.org](https://nodejs.org)) |
| **Expo Go** | On your phone ([expo.dev/go](https://expo.dev/go)) — Android or iOS |

That is all. **No API key.**

---

## 2. Install and run (two terminals)

```bash
cd "d:/sanskrit app"
npm install
```

**Terminal 1 — the translator server**

```bash
npm run server
```

```
Sanskrit Translator API on http://localhost:3001
Translating with : free dictionary (no key, no cost)
Photo text       : no — the app will ask the user to type
API key          : not set
```

**Terminal 2 — the app**

```bash
npx expo start
```

Scan the QR code with Expo Go. No custom build, no dev client.

---

## 3. Point the app at your server

The server is already deployed and running:

```
https://translater-5zmo.onrender.com
```

`.env` is already filled in with that address, so you can skip this step. If
you ever move the server, change it in `.env` and restart Metro:

```bash
EXPO_PUBLIC_API_URL=https://<your-new-address>
```

Running the server on your own computer instead:

| Where the app runs | `EXPO_PUBLIC_API_URL` |
| --- | --- |
| Android emulator | `http://10.0.2.2:3001` |
| iOS simulator | `http://localhost:3001` |
| **Real phone** | `http://192.168.x.x:3001` (your computer's Wi-Fi address) |

Find it with `ipconfig` (Windows) or `ifconfig | grep "inet "` (Mac). The phone
and computer must be on the **same Wi-Fi**. Restart Metro after changing `.env`.

---

## 4. Photo scanning

Reading text from a photo needs an online vision model, which is not free — so in
the free setup the Scan tab **does not read photos for you**. It opens the
camera so you can read the text comfortably and asks you to type or paste what
you see. Everything else works exactly as before.

Add `OPENAI_API_KEY` one day and photo reading switches on by itself: the Scan
tab then reads text from photos and translates it live, with the OCR text shown
in an editable box so you can fix mistakes.

---

## 5. Add the AI (optional, free tier available)

Only if you want full-grammar Sanskrit and photo scanning:

```bash
copy server\.env.example server\.env
```

```env
OPENAI_API_KEY=sk-xxxxxxxx
OPENAI_MODEL=gpt-4o
OPENAI_VISION_MODEL=gpt-4o
```

Then in `server/config.js` set `TRANSLATE_ENGINE` to `'llm'`, or start the
server with `TRANSLATE_ENGINE=llm npm run server`. With the key present the app
also turns on:

- **photo reading** — the Scan tab reads text from photos and translates live
- **self-verification** — the Sanskrit is back-translated and compared
- **temperature 0** — the same sentence always gives the same Sanskrit

You can also point at a local, completely free model instead of a paid key:

```bash
# Ollama on your own computer — no account, no cost, no data leaves the machine
ollama pull qwen2.5:7b
TRANSLATE_ENGINE=llm OPENAI_BASE_URL=http://localhost:11434/v1 OPENAI_API_KEY=ollama npm run server
```

---

## 6. Consistency (why the same text always gives the same answer)

1. **Dictionary first** — no randomness at all; the same words always produce
   the same Sanskrit.
2. **Caching, twice** — the server remembers recent answers in memory, and the
   phone keeps its own copy in `AsyncStorage`. A repeated sentence comes back
   instantly and always with the same wording.
3. **Temperature 0** when the AI engine is on, plus a fixed system prompt.
4. **Verification** in AI mode: the Sanskrit is back-translated into the source
   language, and if the meaning does not match the card says
   *"Please double-check this translation"*.

Free and AI answers are always marked as needing a check, because a dictionary
cannot promise grammar.

---

## 7. Build an APK

### Download the ready-made one (v1.0)

**https://github.com/veera08231/translater/releases/download/v1.0/sanskrit-translator.apk**

113 MB. Install it on any Android phone — Expo Go is not needed. Android will ask
you to allow "install from unknown apps"; that warning is normal for any app that
is not from the Play Store.

### Build your own

```bash
npm install -g eas-cli      # once
eas login                   # once
npm run configure:android   # once — Android signing credentials
npm run build:apk           # eas build -p android --profile preview
```

`eas.json` has three profiles:

| Profile | What you get | Command |
| --- | --- | --- |
| `preview` | **APK** you can install on any phone | `npm run build:apk` |
| `development` | Development build with a launcher | `npm run build:dev` |
| `production` | Release build for Google Play | `npm run build:release` |

---

## 8. Test it

```bash
npm test
```

59 checks, **no API key and no network** — it covers the dictionary, the free
engine, the online-service fallback (with the network stubbed), OCR cleaning,
validation, caching and the AI round trip.

---

## 9. Deploy the server free (Render)

### The short way (recommended)

Render → **New → Blueprint** → pick `veera08231/translater` → **Apply**.

Nothing to type. You get `https://translater-api.onrender.com`.

### If you use "New → Web Service" instead

Render guesses from your root `package.json`, which is the **mobile app**, so it
fills in the wrong values. Change these five fields:

| Field | Render suggests | Put this |
| --- | --- | --- |
| **Root Directory** | *(empty)* | **`server`** |
| **Start Command** | `node expo-router/entry` | **`node index.js`** |
| **Build Command** | `npm install` | `npm install --omit=dev` |
| **Health Check Path** | *(under Advanced)* | `/api/health` |
| **Instance Type** | Free | Free to start |

Leave **Branch** = `main`, **Region** = Singapore (or Oregon), and leave the
environment variables empty — the free setup needs none.

Then test it: open `https://translater-api.onrender.com/api/health` and you
should see

```json
{"ok":true,"translateEngine":"free","ocrAvailable":false,"apiKeyConfigured":false}
```

Finally point the app at it:

```bash
# .env in the project root
EXPO_PUBLIC_API_URL=https://translater-api.onrender.com
```

`rootDir: server` means only the three small server packages are installed —
seconds, not the whole Expo dependency tree.

**Free-plan notes**
- The instance sleeps after 15 minutes of no traffic. The app calls
  `/api/health` when it opens, so it is awake by the time you press
  **Translate**; a very first request after a long pause can take ~30 s.
- `plan: free` → `plan: starter` in `render.yaml` for an always-on instance.
- The in-memory cache resets when the instance restarts; the phone's own cache
  is what guarantees identical answers for you.
- **There is no login anywhere** — not in the app, not on Render beyond your own
  account, and no user accounts are created.
- `region: singapore` is set for India. Others: `oregon`, `ohio`, `virginia`,
  `frankfurt`.

### Other hosts

```bash
# Docker (Railway, Fly.io, a VPS)
docker build -t sanskrit-api ./server
docker run -p 3001:3001 -e OPENAI_API_KEY=sk-... sanskrit-api

# Serverless (Vercel)
# api/translate.js and api/ocr.js reuse the same handlers
```

### Settings the server understands

| Variable | Default | What it does |
| --- | --- | --- |
| `TRANSLATE_ENGINE` | `free` | `free`, or `llm` when you have a key |
| `USE_FREE_APIS` | `true` | Set `false` to use only the bundled dictionary |
| `OCR_ENGINE` | `auto` | Photo reading, on only when a key is present |
| `OPENAI_API_KEY` | – | Optional. Enables the AI engine and photo scanning |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Any OpenAI-compatible provider, or Ollama |
| `OPENAI_MODEL` / `OPENAI_VISION_MODEL` | `gpt-4o` | Models used in AI mode |
| `PORT` | `3001` | Set automatically by most hosts |
| `RATE_LIMIT_PER_MINUTE` | `40` | Requests per IP per minute |

---

## 10. Project structure

```
app/                        screens (Expo Router)
  _layout.tsx               fonts + light/dark theme + stack
  (tabs)/_layout.tsx        the 3 bottom tabs
  (tabs)/index.tsx          Type
  (tabs)/scan.tsx           Scan (camera, or typing, depending on the server)
  (tabs)/history.tsx        History
  item/[id].tsx             one saved translation (modal)
components/                 reusable pieces (Button, ResultCard, TagChip, ...)
constants/config.ts         API address, timeouts, limits
hooks/                      useTheme, useTranslation, useHistory,
                            useLanguageTag, useBackendInfo
services/                   api, translate, ocr, cache, history (AsyncStorage)
utils/                      theme, detectLanguage, cleanOcr, hash, errors, dates
types/                      shared TypeScript types
server/
  engines/
    lexicon.js              ~2,100 hand-checked entries
    freeEngine.js           dictionary + conjugations + language detection
    webEngine.js            the free online services
    index.js                which engine is switched on
  handlers.js  llm.js  prompts.js  cache.js  index.js
  smoke-test.js             59 checks, no key, no network
render.yaml                 one-click Render blueprint
server/Dockerfile           for Railway, Fly.io, a VPS
api/                        serverless version of the same two endpoints
```

---

## 11. Troubleshooting

| What you see | What to do |
| --- | --- |
| "No internet. Please connect and try again." | The phone cannot reach the server. Same Wi-Fi? Is `EXPO_PUBLIC_API_URL` your computer's IP rather than `localhost`? |
| "Reading text from photos is not available here." | Expected in the free setup — type the text instead. Add an `OPENAI_API_KEY` on the server to turn it on. |
| "This is taking too long. Please try again." | A free Render instance was asleep; press **Try again**. |
| The server prints `Photo text : no` | Correct — no vision model configured. |
| Some words are left untranslated | The dictionary did not know them and no online service answered. They are shown as-is on purpose rather than guessed. |
| Sanskrit letters look wrong | Restart Expo with `npx expo start --clear`. |
| Changes to `.env` do nothing | Stop Metro and start it again; values are read at start-up. |

---

## 12. Good to know

- **Free answers are word-by-word.** The Sanskrit words are hand-checked and the
  verbs are conjugated, but word order is the original one. Always read the
  *"please double-check"* note — that is exactly what it is telling you.
- **The free online services are someone else's free service.** They can be slow
  or rate-limited. When that happens the app falls back to the dictionary, and if
  the dictionary also fails the original words are shown rather than invented.
- **Nothing is stored anywhere** except your own phone (history and cache) and
  the server's short-lived memory cache.
- **Listen** uses the phone's Devanagari (Hindi) voice; most phones have no
  separate Sanskrit voice.