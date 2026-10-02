/**
 * Post-extraction quality gate for uploaded PDFs.
 *
 * `pdf-parse` performs text-layer extraction only: there is no OCR, no table
 * reconstruction and no layout analysis. A scanned or image-only PDF therefore
 * extracts to (almost) nothing, and indexing it produced confident answers with
 * no sources behind them. We now detect that state and refuse to index it,
 * naming OCR as the reason, instead of pretending the document is empty.
 *
 * Thresholds are characters of extracted text per page, and are env-tunable:
 *   PDF_MIN_CHARS_PER_PAGE         (default 20)  below this there is no usable text layer
 *   PDF_LOW_DENSITY_CHARS_PER_PAGE (default 200) below this the PDF is likely table/image heavy
 */

export const DEFAULT_MIN_CHARS_PER_PAGE = 20;
export const DEFAULT_LOW_DENSITY_CHARS_PER_PAGE = 200;

export function minCharsPerPage(): number {
  const raw = Number(process.env.PDF_MIN_CHARS_PER_PAGE);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MIN_CHARS_PER_PAGE;
}

export function lowDensityCharsPerPage(): number {
  const raw = Number(process.env.PDF_LOW_DENSITY_CHARS_PER_PAGE);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_LOW_DENSITY_CHARS_PER_PAGE;
}

export type PdfExtraction = {
  /** Characters of extracted text. */
  chars: number;
  /** Pages counted for the density check (at least 1, so a 0-page read cannot divide by zero). */
  pages: number;
  charsPerPage: number;
  /** True when the PDF has no usable text layer and must not be indexed. */
  rejected: boolean;
  /** Operator-facing reason, only set when `rejected`. */
  reason?: string;
  /** Non-fatal advice, only set when the document is indexable but thin. */
  warning?: string;
};

const NO_TEXT_LAYER_REASON =
  'This PDF appears to be scanned or image-only — it has no extractable text layer. ' +
  'OCR is required before it can be indexed. Run it through an OCR tool (Adobe Acrobat, ' +
  'ABBYY, Tesseract, or your scanner software) and upload the result.';

/**
 * Decide whether extracted text is usable. Pure and synchronous so the upload
 * path can call it before any chunking or embedding work is done.
 */
export function analyzeExtraction(
  text: string,
  pageCount: number,
  thresholds: { min: number; lowDensity: number } = {
    min: minCharsPerPage(),
    lowDensity: lowDensityCharsPerPage(),
  },
): PdfExtraction {
  const collapsed = (text || '').replace(/\s+/g, ' ').trim();
  const chars = collapsed.length;
  const pages = Math.max(1, Math.floor(Number(pageCount) || 0));
  const charsPerPage = chars / pages;

  // No text at all, or so little that it cannot be a real text layer.
  if (chars === 0 || charsPerPage < thresholds.min) {
    return {
      chars,
      pages,
      charsPerPage: Math.round(charsPerPage * 100) / 100,
      rejected: true,
      reason: NO_TEXT_LAYER_REASON,
    };
  }

  // Indexable, but thin: probably table- or image-heavy, so answers will be
  // thinner than the page count suggests.
  const warning =
    charsPerPage < thresholds.lowDensity
      ? `Low text density (${Math.round(charsPerPage)} characters per page). This PDF looks ` +
        'table- or image-heavy, so its content may be under-represented in answers. ' +
        'OCR is not required, but expect gaps on scanned or tabular content.'
      : undefined;

  return {
    chars,
    pages,
    charsPerPage: Math.round(charsPerPage * 100) / 100,
    rejected: false,
    warning,
  };
}
