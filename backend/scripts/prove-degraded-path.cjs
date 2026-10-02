/**
 * Degraded-path proof harness (not part of the shipped app).
 *
 * Reproduces the Vercel serverless path exactly: VERCEL=1 means main.ts skips
 * app.listen(), api/index.ts mounts the cached handler, and everything must go
 * through buildApp() -> app.init(). Runs with OPENAI_API_KEY deleted.
 */
const fs = require('fs');
const path = require('path');

// Load the real .env ourselves, then make dotenv a no-op (it re-runs inside
// main.js and would put OPENAI_API_KEY straight back).
const envPath = path.join(__dirname, '..', '.env');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let value = m[2];
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  process.env[m[1]] = value;
}
process.env.DOTENV_CONFIG_PATH = '/dev/null';
// Production logger config: no pino-pretty transport, so log lines are not
// swallowed by the async transport worker on exit.
process.env.NODE_ENV = 'production';

process.env.VERCEL = '1';
delete process.env.OPENAI_API_KEY;
delete process.env.ALLOW_HASH_EMBEDDINGS;
delete process.env.EMBEDDING_MODEL;

const http = require('http');
const { getHandler } = require('../dist/src/main.js');

const PORT = 4123;

const request = (method, path, body) =>
  new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      { host: '127.0.0.1', port: PORT, path, method, headers: payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {} },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });

(async () => {
  console.log('--- booting via getHandler() with VERCEL=1, OPENAI_API_KEY unset ---');
  const handler = await getHandler();
  const server = http.createServer((req, res) => handler(req, res));
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

  const health = await request('GET', '/health/embeddings');
  console.log('\n=== GET /health/embeddings ->', health.status, '===');
  console.log(JSON.stringify(JSON.parse(health.body), null, 2));

  const ask = await request('POST', '/widget/ask', {
    companyId: 'demo',
    question: 'What are the key requirements?',
  });
  console.log('\n=== POST /widget/ask ->', ask.status, '===');
  const parsed = JSON.parse(ask.body);
  console.log('retrievalMode:', parsed.retrievalMode);
  console.log('answer:', String(parsed.answer).slice(0, 400));
  console.log('sources:', Array.isArray(parsed.sources) ? parsed.sources.length : parsed.sources);
  if (Array.isArray(parsed.sources) && parsed.sources[0]) {
    console.log('top source:', JSON.stringify(parsed.sources[0]).slice(0, 300));
  }

  // Same path, unrelated question: must not return confident nonsense.
  const off = await request('POST', '/widget/ask', {
    companyId: 'demo',
    question: 'What is the retention policy for marine insurance claims?',
  });
  console.log('\n=== POST /widget/ask (off-topic) ->', off.status, '===');
  const offParsed = JSON.parse(off.body);
  console.log('retrievalMode:', offParsed.retrievalMode);
  console.log('answer:', String(offParsed.answer).slice(0, 300));
  console.log('sources:', Array.isArray(offParsed.sources) ? offParsed.sources.length : offParsed.sources);

  const health2 = await request('GET', '/health/embeddings');
  console.log('\n=== GET /health/embeddings (after traffic) ->', health2.status, '===');
  console.log(JSON.stringify(JSON.parse(health2.body), null, 2));

  server.close();
  // Let the logger flush before exiting.
  await new Promise((r) => setTimeout(r, 500));
  process.exit(0);
})().catch((err) => {
  console.error('PROOF FAILED:', err);
  process.exit(1);
});
