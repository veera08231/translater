/**
 * Vercel / any serverless host: POST /api/ocr
 *
 * Reads the text in a photo and returns it cleaned.
 */

const { handleOcr } = require('../server/handlers');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ code: 'unknown', error: 'Use POST.' });
  }

  const { status, body } = await handleOcr(req.body || {});
  return res.status(status).json(body);
};