/**
 * The only file that talks to the AI provider.
 *
 * The API key lives in the server's environment only — it is never shipped
 * inside the mobile app.
 */

const config = require('./config');
const prompts = require('./prompts');

const ENDPOINT = `${config.OPENAI_BASE_URL.replace(/\/+$/, '')}/chat/completions`;
const TIMEOUT_MS = 45_000;

/** An error that is safe to turn into a friendly message. */
class ServerError extends Error {
  constructor(code, message, status = 400) {
    super(message || code);
    this.name = 'ServerError';
    this.code = code;
    this.status = status;
  }
}

function mapStatus(status) {
  if (status === 401 || status === 403) return 'not_configured';
  if (status === 429) return 'too_many';
  if (status === 408) return 'timeout';
  return 'server';
}

/** Newer reasoning models use a different field for the output limit. */
function usesMaxCompletionTokens(model) {
  return /^(o1|o3|o4|gpt-5)/.test(model);
}

async function callModel({ model, messages, maxTokens = 1200, json = false }) {
  if (!config.OPENAI_API_KEY) {
    throw new ServerError('not_configured', 'OPENAI_API_KEY is not set on the server', 500);
  }

  const body = {
    model,
    // Accuracy + consistency: never let the model get creative.
    temperature: 0,
    messages,
  };
  if (usesMaxCompletionTokens(model)) {
    body.max_completion_tokens = maxTokens;
  } else {
    body.max_tokens = maxTokens;
  }
  if (json) body.response_format = { type: 'json_object' };

  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error && error.name === 'TimeoutError';
    throw new ServerError(timedOut ? 'timeout' : 'server', 'Could not reach the model', 502);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const code = mapStatus(response.status);
    throw new ServerError(code, `${code} (${response.status}): ${detail.slice(0, 300)}`, 502);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content ?? '';
  return typeof content === 'string' ? content.trim() : '';
}

/** Plain text completion (temperature 0). */
async function chat({ system, user, maxTokens = 1200, json = false }) {
  const messages = system
    ? [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ]
    : [{ role: 'user', content: user }];

  return callModel({ model: config.OPENAI_MODEL, messages, maxTokens, json });
}

/** Reads text from a photo with a vision model. */
async function readImageText({ base64, mimeType }) {
  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompts.OCR_SYSTEM },
        {
          type: 'image_url',
          image_url: {
            url: `data:${mimeType || 'image/jpeg'};base64,${base64}`,
            detail: 'auto',
          },
        },
      ],
    },
  ];

  return callModel({ model: config.OPENAI_VISION_MODEL, messages, maxTokens: 1500 });
}

module.exports = { chat, readImageText, ServerError };