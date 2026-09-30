/**
 * A fake model server.
 *
 * It lets you test the whole backend — translation, verification and caching —
 * without an API key and without spending anything. Used by smoke-test.js.
 */

const http = require('node:http');

/**
 * @param {object} [options]
 * @param {boolean} [options.failVerification] judge returns "does not match"
 * @returns {import('node:http').Server}
 */
function createMockModel(options = {}) {
  return http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      let parsed = {};
      try {
        parsed = JSON.parse(body || '{}');
      } catch {
        parsed = {};
      }

      const messages = parsed.messages || [];
      const system = messages
        .map((message) => message.content)
        .find((content) => typeof content === 'string' && content.startsWith('You '));

      let answer;
      if (system && system.startsWith('You are an expert Sanskrit scholar')) {
        // "<language>\n<sanskrit>", exactly how the app is asked to answer.
        answer = 'Tamil\nस्वागतम् संसारः';
      } else if (system && system.startsWith('You are a careful translator')) {
        answer = 'வணக்கம் அண்ணம்';
      } else if (system && system.startsWith('You check translations')) {
        // Any conversation containing MISMATCH is judged "not the same".
        const judgeFailed = JSON.stringify(messages).includes('MISMATCH');
        answer = judgeFailed ? '{"matches": false}' : '{"matches": true}';
      } else if (Array.isArray(messages[0]?.content)) {
        answer = '|  |  ***\nThe sky is blue.\n::::\ntransla-\ntion is hard.';
      } else {
        answer = 'unexpected call';
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: answer } }] }));
    });
  });
}

module.exports = { createMockModel };