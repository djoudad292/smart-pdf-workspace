import { AIService } from './ai.service';
import { StoreService } from '../common/store.service';
import { EmbeddingsService, isHashVector } from './embeddings.service';
import { Test } from '@nestjs/testing';

describe('AIService retrieval mode', () => {
  const saved = { ...process.env };
  let store: any;
  let embeddings: EmbeddingsService;
  let ai: AIService;

  const hit = (chunkText: string, similarity = 0.5) => ({
    id: 'c1',
    chunkText,
    documentId: 'doc-1',
    documentTitle: 'Doc',
    similarity,
  });

  beforeEach(async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ALLOW_HASH_EMBEDDINGS;
    delete process.env.RAG_SIMILARITY_THRESHOLD;
    // Hermetic: the LLM is unreachable, so answers fall back to quoting passages.
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline in tests'));

    store = {
      findDocumentById: jest.fn().mockResolvedValue({
        id: 'doc-1',
        companyId: 'co-1',
        title: 'Doc',
        content: 'x',
      }),
      searchChunksByDocument: jest.fn().mockResolvedValue([hit('The retention period is 30 days.')]),
      searchChunksByCompany: jest.fn().mockResolvedValue([hit('The retention period is 30 days.')]),
      searchChunksByDocumentKeyword: jest.fn().mockResolvedValue([hit('The retention period is 30 days.', 0.5)]),
      searchChunksByCompanyKeyword: jest.fn().mockResolvedValue([hit('The retention period is 30 days.', 0.5)]),
    };
    embeddings = new EmbeddingsService();
    const module = await Test.createTestingModule({
      providers: [AIService, { provide: StoreService, useValue: store }, { provide: EmbeddingsService, useValue: embeddings }],
    }).compile();
    ai = module.get(AIService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = saved;
  });

  describe('generateEmbedding fails loudly by default', () => {
    it('throws EmbeddingsUnavailableError with no key and no opt-in', async () => {
      await expect(ai.generateEmbedding('hello')).rejects.toThrow(/ALLOW_HASH_EMBEDDINGS is not enabled/);
    });

    it('returns a tagged hash vector only on explicit opt-in', async () => {
      process.env.ALLOW_HASH_EMBEDDINGS = 'true';
      const vector = await ai.generateEmbedding('hello');
      expect(vector).toHaveLength(1536);
      expect(isHashVector(vector)).toBe(true);
    });
  });

  describe('keyword-degraded retrieval', () => {
    it('never calls a vector search when embeddings are unavailable', async () => {
      const result = await ai.askDocument('co-1', 'doc-1', 'What is the retention period?');
      expect(store.searchChunksByDocument).not.toHaveBeenCalled();
      expect(store.searchChunksByDocumentKeyword).toHaveBeenCalled();
      expect(result.retrievalMode).toBe('keyword-degraded');
      expect(result.answer).toContain('30 days');
    });

    it('propagates keyword-degraded across the company path used by /widget/ask', async () => {
      const result = await ai.askCompanyDocuments('co-1', 'What is the retention period?', true);
      expect(store.searchChunksByCompany).not.toHaveBeenCalled();
      expect(store.searchChunksByCompanyKeyword).toHaveBeenCalled();
      expect(result.retrievalMode).toBe('keyword-degraded');
      expect(result.sources[0].similarity).toBe(0.5);
    });

    it('does not relax a threshold when retrieval comes back empty', async () => {
      store.searchChunksByDocumentKeyword.mockResolvedValue([]);
      const result = await ai.askDocument('co-1', 'doc-1', 'What is the retention period?');
      expect(store.searchChunksByDocument).not.toHaveBeenCalled();
      expect(result.sources).toEqual([]);
      expect(result.retrievalMode).toBe('keyword-degraded');
    });

    it('reports keyword-degraded on the empty-result answer too', async () => {
      store.searchChunksByCompanyKeyword.mockResolvedValue([]);
      const result = await ai.askCompanyDocuments('co-1', 'unrelated', true);
      expect(result.sources).toEqual([]);
      expect(result.retrievalMode).toBe('keyword-degraded');
    });
  });

  describe('vector retrieval', () => {
    it('reports vector mode when a real embedding is produced', async () => {
      const spy = jest.spyOn(ai, 'generateEmbedding').mockResolvedValue(new Array(1536).fill(0.05));
      const result = await ai.askDocument('co-1', 'doc-1', 'What is the retention period?');
      expect(spy).toHaveBeenCalled();
      expect(store.searchChunksByDocument).toHaveBeenCalled();
      expect(store.searchChunksByDocumentKeyword).not.toHaveBeenCalled();
      expect(result.retrievalMode).toBe('vector');
    });

    it('uses the configured similarity threshold', async () => {
      jest.spyOn(ai, 'generateEmbedding').mockResolvedValue(new Array(1536).fill(0.05));
      process.env.RAG_SIMILARITY_THRESHOLD = '0.42';
      await ai.askDocument('co-1', 'doc-1', 'What is the retention period?');
      expect(store.searchChunksByDocument.mock.calls[0][3]).toBe(0.42);
    });

    it('falls back to keyword scoring when the vector search itself fails', async () => {
      jest.spyOn(ai, 'generateEmbedding').mockResolvedValue(new Array(1536).fill(0.05));
      store.searchChunksByDocument.mockRejectedValue(new Error('pgvector unavailable'));
      const result = await ai.askDocument('co-1', 'doc-1', 'What is the retention period?');
      expect(store.searchChunksByDocumentKeyword).toHaveBeenCalled();
      expect(result.retrievalMode).toBe('keyword-degraded');
    });
  });

  describe('hash vectors never reach retrieval', () => {
    it('refuses to search with a hash vector and degrades instead', async () => {
      process.env.ALLOW_HASH_EMBEDDINGS = 'true';
      const result = await ai.askDocument('co-1', 'doc-1', 'What is the retention period?');
      expect(store.searchChunksByDocument).not.toHaveBeenCalled();
      expect(store.searchChunksByDocumentKeyword).toHaveBeenCalled();
      expect(result.retrievalMode).toBe('hash-fallback');
    });
  });

  describe('keyword term extraction', () => {
    it('drops stopwords that would match everything', async () => {
      await ai.askDocument('co-1', 'doc-1', 'What is the retention period?');
      const terms = store.searchChunksByDocumentKeyword.mock.calls[0][1] as string[];
      expect(terms).toEqual(['retention', 'period']);
    });
  });
});
