const EMBEDDING_DIM = 1536;

function hashString(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return h;
}

/**
 * Deterministic local embedding fallback (1536-dim, unit-normalised).
 * Used when OpenAI is unavailable. Same algorithm for both tenant and guest
 * workspaces so similarity thresholds stay consistent.
 */
export function embedLocally(text: string): number[] {
  const vector = new Array(EMBEDDING_DIM).fill(0);
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const grams: string[] = [];
  for (const word of normalized.split(/\s+/)) {
    if (!word) continue;
    grams.push(word);
    if (word.length > 2) {
      grams.push(word.slice(0, 5));
      grams.push(word.slice(-5));
    }
  }
  const joined = normalized.replace(/\s+/g, '');
  for (let n = 3; n <= 5; n++) {
    for (let i = 0; i + n <= joined.length; i++) {
      grams.push(joined.slice(i, i + n));
    }
  }
  for (const g of grams) {
    const h = hashString(g);
    const idx = Math.abs(h) % EMBEDDING_DIM;
    vector[idx] += (h & 1) === 0 ? 1 : -1;
  }
  let mag = 0;
  for (const v of vector) mag += v * v;
  mag = Math.sqrt(mag) || 1;
  return vector.map((v) => v / mag);
}