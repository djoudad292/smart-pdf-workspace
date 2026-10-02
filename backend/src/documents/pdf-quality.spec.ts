import {
  DEFAULT_LOW_DENSITY_CHARS_PER_PAGE,
  DEFAULT_MIN_CHARS_PER_PAGE,
  analyzeExtraction,
  lowDensityCharsPerPage,
  minCharsPerPage,
} from './pdf-quality';

describe('analyzeExtraction', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    delete process.env.PDF_MIN_CHARS_PER_PAGE;
    delete process.env.PDF_LOW_DENSITY_CHARS_PER_PAGE;
  });

  afterAll(() => {
    process.env = saved;
  });

  describe('thresholds', () => {
    it('has documented defaults', () => {
      expect(minCharsPerPage()).toBe(DEFAULT_MIN_CHARS_PER_PAGE);
      expect(lowDensityCharsPerPage()).toBe(DEFAULT_LOW_DENSITY_CHARS_PER_PAGE);
      expect(DEFAULT_MIN_CHARS_PER_PAGE).toBe(20);
      expect(DEFAULT_LOW_DENSITY_CHARS_PER_PAGE).toBe(200);
    });

    it('reads the env overrides and ignores nonsense values', () => {
      process.env.PDF_MIN_CHARS_PER_PAGE = '5';
      process.env.PDF_LOW_DENSITY_CHARS_PER_PAGE = '50';
      expect(minCharsPerPage()).toBe(5);
      expect(lowDensityCharsPerPage()).toBe(50);

      process.env.PDF_MIN_CHARS_PER_PAGE = '0';
      process.env.PDF_LOW_DENSITY_CHARS_PER_PAGE = 'abc';
      expect(minCharsPerPage()).toBe(DEFAULT_MIN_CHARS_PER_PAGE);
      expect(lowDensityCharsPerPage()).toBe(DEFAULT_LOW_DENSITY_CHARS_PER_PAGE);
    });
  });

  describe('rejection: no usable text layer', () => {
    it('rejects an empty extraction', () => {
      const result = analyzeExtraction('', 12);
      expect(result.rejected).toBe(true);
      expect(result.chars).toBe(0);
    });

    it('rejects a whitespace-only extraction', () => {
      const result = analyzeExtraction('   \n\t\n  \f  ', 12);
      expect(result.rejected).toBe(true);
      expect(result.chars).toBe(0);
    });

    it('names OCR as the reason', () => {
      const result = analyzeExtraction('', 3);
      expect(result.reason).toMatch(/scanned or image-only/);
      expect(result.reason).toMatch(/OCR is required/);
    });

    it('rejects when the per-page density is below the minimum', () => {
      const result = analyzeExtraction('Page header', 40);
      expect(result.pages).toBe(40);
      expect(result.charsPerPage).toBeLessThan(DEFAULT_MIN_CHARS_PER_PAGE);
      expect(result.rejected).toBe(true);
    });

    it('does not divide by zero when the page count is missing', () => {
      const result = analyzeExtraction('', 0);
      expect(result.pages).toBe(1);
      expect(result.charsPerPage).toBe(0);
      expect(result.rejected).toBe(true);
    });

    it('never warns on a rejected document', () => {
      expect(analyzeExtraction('', 5).warning).toBeUndefined();
    });
  });

  describe('warning: low but usable density', () => {
    it('warns without rejecting for a table/image-heavy PDF', () => {
      // 164 characters over 3 pages = ~55 chars/page: above the reject floor,
      // below the low-density threshold.
      const text = 'Total 1,200 | Ref A-9 | Q3 | Net | 2026 |'.repeat(4);
      const result = analyzeExtraction(text, 3);
      expect(result.chars).toBe(164);
      expect(result.rejected).toBe(false);
      expect(result.warning).toMatch(/Low text density/);
      expect(result.warning).toMatch(/55 characters per page/);
      expect(result.warning).toMatch(/OCR is not required/);
    });

    it('accepts explicit thresholds so the boundary is testable', () => {
      // 100 chars over 2 pages = 50 chars/page: above min, below low density.
      expect(analyzeExtraction('a'.repeat(100), 2, { min: 20, lowDensity: 200 }).warning).toBeDefined();
      expect(analyzeExtraction('a'.repeat(100), 2, { min: 5, lowDensity: 20 }).warning).toBeUndefined();
      // 100 chars over 10 pages = 10 chars/page: below the minimum, so rejected.
      expect(analyzeExtraction('a'.repeat(100), 10, { min: 20, lowDensity: 200 }).rejected).toBe(true);
    });
  });

  describe('acceptance: a normal text PDF', () => {
    it('indexes a text-layer PDF with no warning and no error', () => {
      const text = 'x'.repeat(3000);
      const result = analyzeExtraction(text, 10);
      expect(result.rejected).toBe(false);
      expect(result.warning).toBeUndefined();
      expect(result.reason).toBeUndefined();
      expect(result.charsPerPage).toBe(300);
    });
  });
});
