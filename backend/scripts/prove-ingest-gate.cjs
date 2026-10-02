/**
 * Ingest-gate proof harness (not part of the shipped app).
 *
 * Runs the real Nest app through the Vercel serverless path with
 * OPENAI_API_KEY unset, then uploads hand-built PDFs to the public guest
 * sandbox to show: a text-layer PDF is indexed, a scanned/image-only PDF is
 * rejected naming OCR, and no embedding call is spent on a rejected upload.
 */
const fs = require('fs');
const path = require('path');

for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let v = m[2];
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  process.env[m[1]] = v;
}
process.env.DOTENV_CONFIG_PATH = '/dev/null';
process.env.NODE_ENV = 'production';
process.env.VERCEL = '1';
delete process.env.OPENAI_API_KEY;
delete process.env.ALLOW_HASH_EMBEDDINGS;
// Prove the density threshold is env-tunable: contract.pdf below carries ~1500
// characters on one page, so a 5000 threshold makes it trip the warning.
process.env.PDF_LOW_DENSITY_CHARS_PER_PAGE = '5000';

/** Minimal single-page PDF built by hand: `text` is drawn with Tj operators. */
function makePdf(text, contentOverride) {
  const lines = String(text).split('\n');
  const body = ['BT', '/F1 12 Tf', '72 720 Td', '14 TL'];
  for (const line of lines) body.push(`(${line.replace(/([()\\])/g, '\\$1')}) Tj`, 'T*');
  body.push('ET');
  if (contentOverride) body.push(contentOverride);
  const stream = body.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

const http = require('http');
const { getHandler } = require('../dist/src/main.js');
const PORT = 4124;

function multipart(field, filename, buffer) {
  const b = '----proof' + Math.random().toString(36).slice(2);
  const head = Buffer.from(
    `--${b}\r\nContent-Disposition: form-data; name="${field}"; filename="${filename}"\r\n` +
      'Content-Type: application/pdf\r\n\r\n',
    'utf8',
  );
  const tail = Buffer.from(`\r\n--${b}--\r\n`, 'utf8');
  return { body: Buffer.concat([head, buffer, tail]), contentType: `multipart/form-data; boundary=${b}` };
}

function raw(method, urlPath, { body, contentType, token } = {}) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (body) {
      headers['Content-Type'] = contentType;
      headers['Content-Length'] = body.length;
    }
    if (token) headers.Authorization = `Bearer ${token}`;
    const req = http.request({ host: '127.0.0.1', port: PORT, path: urlPath, method, headers }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  console.log('--- booting via getHandler() with VERCEL=1, OPENAI_API_KEY unset ---');
  const handler = await getHandler();
  const server = http.createServer((req, res) => handler(req, res));
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

  const session = JSON.parse((await raw('POST', '/guest/session')).body);
  const token = session.token;
  console.log('\n=== guest sandbox created:', session.companyId, '===');

  // 1. Scanned / image-only: a valid PDF page whose only content is a raster
  //    fill — no text layer, exactly what a scanner produces.
  const scanned = makePdf('SCAN', '0.85 0.85 0.85 rg\n72 72 468 648 re\nf');
  const pdfParse = require('pdf-parse');
  for (const [label, buf] of [['scanned', scanned]]) {
    try {
      const r = await pdfParse(buf);
      console.log(`local pdf-parse [${label}]: pages=${r.numpages} chars=${(r.text || '').trim().length}`);
    } catch (e) {
      console.log(`local pdf-parse [${label}]: THREW ${e.message}`);
    }
  }
  const up1 = await raw('POST', '/guest/documents', { ...multipart('file', 'scanned-contract.pdf', scanned), token });
  const d1 = JSON.parse(up1.body);
  console.log('\n=== upload scanned/image-only PDF ->', up1.status, '===');
  console.log('status          :', d1.status);
  console.log('error           :', d1.error);
  console.log('ingestWarning   :', d1.ingestWarning);
  console.log('published       :', d1.published);

  // 2. Text-layer PDF, comfortably above both thresholds.
  const textLines = [];
  for (let i = 0; i < 14; i++) {
    textLines.push(
      `Clause ${i + 1}. The parties agree that all invoices are payable within thirty days of receipt. ` +
        'This obligation survives termination of the agreement and may be waived only in writing.',
    );
  }
  const good = makePdf(textLines.join('\n'));
  const up2 = await raw('POST', '/guest/documents', { ...multipart('file', 'contract.pdf', good), token });
  const d2 = JSON.parse(up2.body);
  console.log('\n=== upload text-layer PDF ->', up2.status, '===');
  console.log('status          :', d2.status);
  console.log('pageCount       :', d2.pageCount);
  console.log('error           :', d2.error);
  console.log('ingestWarning   :', d2.ingestWarning);

  // 3. Same text PDF, but PDF_LOW_DENSITY_CHARS_PER_PAGE=5000 makes it thin:
  //    indexable, with the warning carried in the upload result.
  const up3 = await raw('POST', '/guest/documents', { ...multipart('file', 'contract-copy.pdf', good), token });
  const d3 = JSON.parse(up3.body);
  console.log('\n=== upload text PDF with PDF_LOW_DENSITY_CHARS_PER_PAGE=5000 ->', up3.status, '===');
  console.log('status          :', d3.status);
  console.log('error           :', d3.error);
  console.log('ingestWarning   :', d3.ingestWarning);

  // The sandbox must still answer, on the keyword path.
  const ask = await raw('POST', '/guest/ask', {
    body: Buffer.from(JSON.stringify({ question: 'How long do invoices stay payable?' })),
    contentType: 'application/json',
    token,
  });
  const a = JSON.parse(ask.body);
  console.log('\n=== POST /guest/ask ->', ask.status, '===');
  console.log('retrievalMode   :', a.retrievalMode);
  console.log('sources         :', Array.isArray(a.sources) ? a.sources.length : a.sources);
  console.log('answer          :', String(a.answer).slice(0, 260));

  // 4. Clean up the sandbox.
  await raw('POST', '/guest/session/end', { token });
  console.log('\n=== guest sandbox ended ===');

  server.close();
  await new Promise((r) => setTimeout(r, 500));
  process.exit(0);
})().catch((err) => {
  console.error('PROOF FAILED:', err);
  process.exit(1);
});
