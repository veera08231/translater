# Sanskrit Translator

Any language → classical Sanskrit, in Devanagari.

Three screens, one button each, big text. Nothing to learn.

| Type | Scan | History |
| ---- | ---- | ------- |
| Type or paste text in any language | Point the camera at text | Every translation you made |

---

## 1. What you need

| | |
| --- | --- |
| **Node.js** | 20.19+ or 22.13+ ([nodejs.org](https://nodejs.org)) |
| **Expo Go** | On your phone ([expo.dev/go](https://expo.dev/go)) — Android or iOS |
| **An AI provider key** | An OpenAI API key (only needed on your computer / server) |
| **EAS account** | Only if you want an APK file (`npx eas-cli login`) |

> The AI key never goes into the app. The app talks to a small backend on your
> computer, and the backend talks to the AI provider.

---

## 2. Install

```bash
cd "d:/sanskrit app"
npm install
```

---

## 3. Set up the two `.env` files

### a) Backend key (this one is secret)

```bash
copy server\.env.example server\.env      # Windows
# cp server/.env.example server/.env       # macOS / Linux
```

Open `server/.env` and put your key in:

```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o
OPENAI_VISION_MODEL=gpt-4o
PORT=3001
```

### b) App address (this one is public — it is only a URL)

```bash
copy .env.example .env
```

| Where the app runs | What to put in `.env` |
| --- | --- |
| Android emulator | `EXPO_PUBLIC_API_URL=http://10.0.2.2:3001` |
| iOS simulator | `EXPO_PUBLIC_API_URL=http://localhost:3001` |
| **Real phone (Expo Go)** | `EXPO_PUBLIC_API_URL=http://192.168.x.x:3001` (your computer's Wi-Fi address) |

To find your computer's address: run `ipconfig` and read *IPv4 Address*, or
`ifconfig | grep "inet "`. The phone and the computer must be on the **same Wi-Fi**.

---

## 4. Run it (two terminals)

> If you deployed the backend already (section 8 — Render, Docker, Vercel),
> skip Terminal 1 and put the server's address in `.env` instead.

**Terminal 1 — backend**

```bash
npm run server
```

```
Sanskrit Translator API on http://localhost:3001
Text model : gpt-4o
Vision     : gpt-4o
API key    : found (put it in server/.env)
```

**Terminal 2 — app**

```bash
npx expo start
```

Scan the QR code with Expo Go (Android: camera icon → *Scan QR code*;
iOS: the camera app). Expo Go is all you need — no custom build, no dev client.

---

## 5. Check the backend on its own

```bash
curl http://localhost:3001/api/health
```

```json
{
  "ok": true,
  "model": "gpt-4o",
  "visionModel": "gpt-4o",
  "apiKeyConfigured": true,
  "cachedTranslations": 0
}
```

---

## 6. How the accuracy works

1. **Temperature 0.** The same sentence always produces the same Sanskrit.
2. **One fixed system prompt** (in `server/prompts.js`) — sandhi, vibhakti,
   vacana, lakara, names and numbers preserved, nothing added or explained.
3. **Verification.** The Sanskrit is back-translated into the original language.
   If it does not match the original, the card shows
   *"Please double-check this translation"*.
4. **Two caches.** The server keeps a memory cache of recent answers, and the
   phone keeps its own cache — a repeated sentence comes back instantly and
   always with the same wording.
5. **Clean OCR.** Photos are read by a vision model, then the text is cleaned
   (noise lines removed, broken words joined) *before* it is translated.

Test the whole backend (translation, verification, caching, OCR cleaning)
with **no API key and no cost** — it uses a built-in fake model:

```bash
npm test
```

It ends with `25 passed, 0 failed.`

---

## 7. Build an APK with EAS

```bash
npm install -g eas-cli      # once
eas login                   # once
```

Check that Android credentials exist (EAS can create them for you):

```bash
npm run configure:android
```

Then:

```bash
npm run build:apk           # eas build -p android --profile preview
```

`eas.json` contains three profiles:

| Profile | What you get | Command |
| --- | --- | --- |
| `preview` | **APK** you can install on any phone (no store) | `npm run build:apk` |
| `development` | Development build with a launcher | `npm run build:dev` |
| `production` | Release build for Google Play | `npm run build:release` |

When the build finishes, open the link, download the APK and install it.
(Allow "install from unknown sources" when Android asks.)

---

## 8. Deploying the backend

You only need a server because the AI key must never live in the app. Once it
is online, every phone uses the same address.

```
app  ──HTTP──▶  your server (Express)  ──HTTPS + key──▶  AI provider
                 ▲
                 └── OPENAI_API_KEY lives only here
```

### Option A — Render (free, recommended to start)

`render.yaml` in this repository is a ready-made blueprint.

1. Put the project on GitHub (or GitLab / Bitbucket).
2. In Render: **New → Blueprint** → select the repository → **Apply**.
3. Render asks for **`OPENAI_API_KEY`** — paste your key and apply.
   Every other setting comes from `render.yaml`.
4. When the build is green you get an address like
   `https://sanskrit-translator-api.onrender.com`. Check it:
   `https://sanskrit-translator-api.onrender.com/api/health`
5. Point the app at it:

   ```bash
   # .env
   EXPO_PUBLIC_API_URL=https://sanskrit-translator-api.onrender.com
   ```

   Then restart `npx expo start` (or rebuild the APK).

Only the three server packages are installed (`rootDir: server`), so the build
takes seconds and never touches the Expo dependency tree.

**Free plan tips**
- A free instance sleeps after 15 minutes of no traffic. The app calls
  `/api/health` when it opens, so the server is already awake by the time you
  press **Translate** — but a first request after a long pause can take ~30 s.
- For real users change `plan: free` to `plan: starter` in `render.yaml`
  (always on, no sleeping).
- The cache lives in memory, so it resets when the instance restarts. The
  phone keeps its own copy, which is the one that matters most.
- `region: singapore` is set for India. Change it in `render.yaml` if you
  prefer (`oregon`, `ohio`, `virginia`, `frankfurt`).

### Option B — Any Docker host (Railway, Fly.io, a VPS, Render)

`server/Dockerfile` only ever installs the three server packages and never
copies `.env`, so the key must be supplied by the host as an environment
variable.

```bash
docker build -t sanskrit-api ./server
docker run -p 3001:3001 -e OPENAI_API_KEY=sk-xxxx sanskrit-api
```

### Option C — Serverless (Vercel)

`api/translate.js` and `api/ocr.js` reuse exactly the same handlers:

```
POST /api/translate
POST /api/ocr
```

Import the repository on Vercel, add `OPENAI_API_KEY` as an environment
variable, deploy.

### Any other host

`server/` is a normal Node server that listens on `0.0.0.0:$PORT`:

```bash
cd server && npm install --omit=dev && node index.js
```

Environment variables it understands:

| Variable | Default | What it does |
| --- | --- | --- |
| `OPENAI_API_KEY` | – | **Required.** The AI provider key |
| `OPENAI_MODEL` | `gpt-4o` | Translation + verification model |
| `OPENAI_VISION_MODEL` | `gpt-4o` | Model that reads text in photos |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Point at any OpenAI-compatible provider |
| `PORT` | `3001` | Provided automatically by most hosts |
| `RATE_LIMIT_PER_MINUTE` | `40` | Requests per IP per minute |
| `MAX_TEXT_LENGTH` | `4000` | Characters per translation |

---

## 9. Project structure

```
app/                        screens (Expo Router)
  _layout.tsx               fonts + light/dark theme + stack
  (tabs)/_layout.tsx        the 3 bottom tabs
  (tabs)/index.tsx          Type
  (tabs)/scan.tsx           Scan
  (tabs)/history.tsx        History
  item/[id].tsx             one saved translation (modal)
components/                 reusable pieces (Button, ResultCard, TagChip, ...)
constants/config.ts         API address, timeouts, limits
hooks/                      useTheme, useTranslation, useHistory, useLanguageTag
services/                   api, translate, ocr, cache, history (AsyncStorage)
utils/                      theme, detectLanguage, cleanOcr, hash, errors, dates
types/                      shared TypeScript types
server/                     the backend proxy (your API key lives here)
  package.json              its own dependencies (Render/Docker install only these)
  Dockerfile                for Railway, Fly.io, a VPS, or Docker on Render
api/                        serverless version of the same two endpoints
render.yaml                 one-click deploy blueprint for Render
```

---

## 10. Troubleshooting

| What you see | What to do |
| --- | --- |
| "No internet. Please connect and try again." | The phone cannot reach the backend. Check the phone and computer are on the same Wi-Fi and `EXPO_PUBLIC_API_URL` uses your computer's IP, not `localhost`. |
| "The translator is not set up yet." | `OPENAI_API_KEY` is missing or wrong in `server/.env`. Restart the server. |
| "Camera is switched off for this app." | Turn the camera on in the phone settings, then reopen the app. |
| Sanskrit letters look wrong | The font did not load — restart Expo with `npx expo start --clear`. |
| Changes to `.env` do nothing | Stop Metro and start it again; values are read at start-up. |

---

## 11. Good to know

- **Listen** uses the phone's Devanagari voice (Hindi). Most phones have no
  separate Sanskrit voice, so the pronunciation is close but not perfect.
- **Live scanning** takes a photo every ~4.5 seconds and only sends it when the
  text changed. Edit the text yourself and the camera stops, so your correction
  is never overwritten.
- Photos are sent to your backend for reading and are not stored anywhere.
- History and the cache live on the phone (AsyncStorage) and can be wiped from
  the History tab.

---