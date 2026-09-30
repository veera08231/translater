/**
 * Vercel / any serverless host: POST /api/translate
 *
 * Exactly the same logic as the local server (server/handlers.js).
 */

const { handleTranslate } = require('../server/handlers');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ code: 'unknown', error: 'Use POST.' });
  }

  const { status, body } = await handleTranslate(req.body || {});
  return res.status(status).json(body);
};