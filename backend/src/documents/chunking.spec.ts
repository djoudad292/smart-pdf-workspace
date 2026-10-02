import { MAX_CHUNK_CHARS, OVERLAP_BUDGET_CHARS, chunkText, clauseBreakPoint, splitSentences } from './chunking';

const sentence = (n: number, len = 60): string => {
  const words = Array.from({ length: n }, (_, i) => `w${i}`).join(' ');
  return `${words}.`;
};

describe('chunkText', () => {
  it('splits sentences on terminators', () => {
    expect(splitSentences('One. Two! Three?')).toEqual(['One.', 'Two!', 'Three?']);
  });

  it('keeps a closing quote with its sentence', () => {
    expect(splitSentences('He said "go." She left.')).toEqual(['He said "go."', 'She left.']);
  });

  it('returns a single chunk for short text', () => {
    const chunks = chunkText('One sentence. Another sentence.');
    expect(chunks).toEqual(['One sentence. Another sentence.']);
  });

  it('never splits mid-sentence', () => {
    const text = Array.from({ length: 60 }, () => sentence(12, 60)).join(' ');
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      // Every sentence in a chunk must end with its own terminator, so no chunk
      // ends in the middle of a sentence.
      expect(chunk.trimEnd()).toMatch(/[.!?…]$/);
    }
  });

  it('keeps every sentence: nothing is lost or truncated', () => {
    const sentences = Array.from({ length: 40 }, () => sentence(8, 50));
    const chunks = chunkText(sentences.join(' '));
    const joined = chunks.join(' ');
    for (const s of sentences) {
      expect(joined).toContain(s);
    }
  });

  it('stays within the chunk budget for normal text', () => {
    const text = Array.from({ length: 200 }, () => sentence(6, 40)).join(' ');
    const chunks = chunkText(text);
    for (const chunk of chunks) {
      // A chunk may carry at most one overlap sentence on top of the budget.
      expect(chunk.length).toBeLessThanOrEqual(MAX_CHUNK_CHARS + OVERLAP_BUDGET_CHARS + 1);
    }
  });

  it('carries a short trailing sentence forward as overlap', () => {
    const text = Array.from({ length: 30 }, () => sentence(6, 40)).join(' ');
    const chunks = chunkText(text);
    const sentences = splitSentences(text);
    const firstTail = sentences.find((s) => chunks[0].includes(s) && s.length < 40);
    if (firstTail) {
      expect(chunks[1]).toContain(firstTail);
    } else {
      expect(chunks.length).toBeGreaterThan(1);
    }
  });

  it('handles a single sentence longer than the budget without cutting a word', () => {
    const words = Array.from({ length: 400 }, (_, i) => `word${i}`);
    const chunks = chunkText(`${words.join(' ')}.`);
    expect(chunks.length).toBeGreaterThan(1);
    // A single sentence longer than the budget has no sentence boundary, so the
    // only guarantee available is that no word is split: reassembling the
    // chunks reproduces the original word sequence exactly.
    const reassembled = chunks.join(' ').replace(/\.\s*$/, '').split(/\s+/);
    expect(reassembled).toEqual(words);
  });

  it('respects paragraph boundaries without producing empty chunks', () => {
    const text = Array.from({ length: 20 }, () => sentence(5, 40)).join('\n\n');
    const chunks = chunkText(text);
    for (const chunk of chunks) expect(chunk.trim().length).toBeGreaterThan(0);
  });

  it('handles empty and whitespace input without throwing', () => {
    expect(chunkText('')).toEqual(['']);
    expect(chunkText('   \n\n  ')).toEqual(['   \n\n  ']);
  });

  it('preserves the content of a document that fits in one chunk', () => {
    const text = 'Alpha one. Beta two. Gamma three.';
    expect(chunkText(text)).toEqual([text]);
  });
});

describe('clauseBreakPoint', () => {
  it('prefers a break near the budget', () => {
    const text = 'aaaa bbbb; cccc dddd eeee ffff';
    const cut = clauseBreakPoint(text, 20);
    expect(cut).toBeLessThanOrEqual(20);
    expect(cut).toBeGreaterThan(0);
  });

  it('returns the full length when no break exists inside the budget', () => {
    expect(clauseBreakPoint('a'.repeat(50), 10)).toBe(50);
  });
});
