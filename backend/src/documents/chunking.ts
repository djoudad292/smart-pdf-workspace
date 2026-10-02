/**
 * Sentence-aware chunking for extracted PDF text. Dependency-free.
 *
 * The previous implementation was paragraph-aware but fell back to a blind
 * `slice(i, i + 500)` stride for long paragraphs, which regularly cut a
 * sentence in half. A half-sentence is a bad retrieval unit: it loses the
 * subject, so an answer built from it is confidently wrong. Chunks here only
 * ever break at a sentence boundary, or — for a single sentence longer than the
 * budget, where no boundary exists — at the nearest clause boundary or
 * whitespace, never mid-word.
 */

/** Hard ceiling for a single chunk, matching the original ~500 char target. */
export const MAX_CHUNK_CHARS = 500;

/**
 * Trailing sentence carried into the next chunk so a fact split across a
 * boundary is still retrievable from either side. Capped well below
 * MAX_CHUNK_CHARS so overlap never crowds out a full sentence.
 */
export const OVERLAP_BUDGET_CHARS = 120;

/**
 * A sentence terminator plus any closing quote/bracket, followed by
 * whitespace. Kept as a single match (rather than used with `String.split`)
 * because `split` would discard the closing quote along with the whitespace.
 */
const SENTENCE_BOUNDARY = /([.!?…]+["'”’»)\]]*)\s+/g;

/** Preferred break points when a single sentence exceeds the whole budget. */
const CLAUSE_BREAK = /[;:—–\s]/;

export function splitSentences(paragraph: string): string[] {
  const out: string[] = [];
  let cursor = 0;
  let carry = '';
  SENTENCE_BOUNDARY.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SENTENCE_BOUNDARY.exec(paragraph)) !== null) {
    out.push((carry + paragraph.slice(cursor, match.index + match[1].length)).trim());
    carry = '';
    cursor = match.index + match[0].length;
  }
  const tail = (carry + paragraph.slice(cursor)).trim();
  if (tail) out.push(tail);
  return out.filter(Boolean);
}

/**
 * Break an over-long single sentence. Returns the cut point, preferring the
 * last clause punctuation or whitespace inside the budget, so the remainder
 * starts on a readable boundary. Returns `length` when no break exists, which
 * keeps the caller making progress.
 */
export function clauseBreakPoint(text: string, budget: number): number {
  const window = text.slice(0, budget);
  for (let i = window.length - 1; i > 0; i--) {
    if (CLAUSE_BREAK.test(window[i])) return i + 1;
  }
  return text.length;
}

/** Force-split sentences that are longer than a whole chunk on their own. */
function splitLongSentence(sentence: string, out: string[]): void {
  let rest = sentence;
  while (rest.length > MAX_CHUNK_CHARS) {
    const cut = clauseBreakPoint(rest, MAX_CHUNK_CHARS);
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
}

/**
 * Split extracted text into retrieval-sized chunks on sentence boundaries,
 * carrying a short overlap between neighbouring chunks.
 */
export function chunkText(content: string): string[] {
  const chunks: string[] = [];
  /** Sentence text of the chunk under construction, excluding any overlap. */
  let body = '';
  /** Trailing sentence of the previous chunk, prepended to the next one. */
  let overlap = '';

  const prefixLength = (): number => (overlap ? overlap.length + 1 : 0);

  const emit = (): void => {
    const text = (overlap ? `${overlap} ${body}` : body).trim();
    if (text) chunks.push(text);
    const sentences = splitSentences(body);
    const last = sentences[sentences.length - 1] || '';
    overlap = last && last.length <= OVERLAP_BUDGET_CHARS ? last : '';
    body = '';
  };

  for (const paragraph of content.split(/\n\s*\n/)) {
    const trimmedParagraph = paragraph.trim();
    if (!trimmedParagraph) continue;

    for (const rawSentence of splitSentences(trimmedParagraph)) {
      const units: string[] = [];
      if (rawSentence.length > MAX_CHUNK_CHARS) {
        splitLongSentence(rawSentence, units);
      } else {
        units.push(rawSentence);
      }

      for (const unit of units) {
        if (body.length > 0 && prefixLength() + body.length + 1 + unit.length > MAX_CHUNK_CHARS) {
          emit();
        }
        // A unit that only just fits does not leave room for the overlap.
        if (body.length === 0 && prefixLength() + 1 + unit.length > MAX_CHUNK_CHARS) {
          overlap = '';
        }
        body = body ? `${body} ${unit}` : unit;
      }
    }
  }

  if (body.length > 0) emit();

  return chunks.length > 0 ? chunks : [content];
}
