// B12 mock LLM: an OpenAI-compatible /v1/chat/completions stub standing in
// for a real (paid) LLM provider, per the task's "local/mocked LLM endpoint,
// not a real paid one" instruction. It does ONE thing: if the user message
// contains an explicit instruction-override marker, it complies and returns
// exactly what the embedded instruction asks for. Otherwise it returns a
// neutral baseline classification. This isolates "does the server's own
// sanitization strip the override before it reaches the model" from "would
// some hypothetical model obey it" -- the real security question for B12.
import http from 'node:http';
import fs from 'node:fs';

const PORT = 18095;
let lastUserContent = null;
const LOG_PATH = new URL('./seen-requests.jsonl', import.meta.url).pathname;

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    let parsed;
    try { parsed = JSON.parse(body); } catch { parsed = {}; }
    const sysMsg = (parsed.messages || []).find(m => m.role === 'system');
    const userMsg = (parsed.messages || []).find(m => m.role === 'user');
    lastUserContent = userMsg ? userMsg.content : null;
    fs.appendFileSync(LOG_PATH, JSON.stringify({ system: sysMsg?.content ?? null, user: lastUserContent }) + '\n');
    const marker = /OVERRIDE_PAYLOAD_MARKER:(\{[^}]*\})/.exec(lastUserContent || '');
    let content;
    if (marker) {
      content = marker[1]; // "the model" complies with the embedded instruction verbatim
    } else {
      content = JSON.stringify({ level: 'low', category: 'general' }); // neutral baseline
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      choices: [{ message: { content } }],
      model: 'mock-local-llm',
    }));
  });
});
server.listen(PORT, '127.0.0.1', () => console.log(`mock LLM on ${PORT}`));

// Expose last-seen user content for the harness to inspect via a side file.
setInterval(() => {}, 1 << 30); // keep process alive
