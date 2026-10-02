import {
  EmbeddingsService,
  EmbeddingsUnavailableError,
  isEmbeddingsUnavailableError,
  isHashVector,
  markHashVector,
  allowHashEmbeddings,
  openAiConfigured,
  embeddingModel,
} from './embeddings.service';

describe('embeddings contract', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ALLOW_HASH_EMBEDDINGS;
    delete process.env.EMBEDDING_MODEL;
  });

  afterAll(() => {
    process.env = saved;
  });

  describe('env contract', () => {
    it('defaults to refusing hash embeddings', () => {
      expect(allowHashEmbeddings()).toBe(false);
      expect(openAiConfigured()).toBe(false);
    });

    it('only opts in on the exact string "true"', () => {
      process.env.ALLOW_HASH_EMBEDDINGS = '1';
      expect(allowHashEmbeddings()).toBe(false);
      process.env.ALLOW_HASH_EMBEDDINGS = 'TRUE';
      expect(allowHashEmbeddings()).toBe(false);
      process.env.ALLOW_HASH_EMBEDDINGS = 'true';
      expect(allowHashEmbeddings()).toBe(true);
    });

    it('reports a configured key', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      expect(openAiConfigured()).toBe(true);
    });

    it('defaults the model to text-embedding-3-small', () => {
      expect(embeddingModel()).toBe('text-embedding-3-small');
      process.env.EMBEDDING_MODEL = 'text-embedding-3-large';
      expect(embeddingModel()).toBe('text-embedding-3-large');
    });
  });

  describe('EmbeddingsUnavailableError', () => {
    it('is a recognisable, reasoned error', () => {
      const err = new EmbeddingsUnavailableError('no provider', 'missing-key');
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('EmbeddingsUnavailableError');
      expect(err.reason).toBe('missing-key');
      expect(isEmbeddingsUnavailableError(err)).toBe(true);
      expect(isEmbeddingsUnavailableError(new Error('nope'))).toBe(false);
      expect(isEmbeddingsUnavailableError('nope')).toBe(false);
    });

    it('defaults the reason to provider-error', () => {
      expect(new EmbeddingsUnavailableError('boom').reason).toBe('provider-error');
    });
  });

  describe('hash vector tagging', () => {
    it('tags a marked vector and leaves other vectors untagged', () => {
      const tagged = markHashVector([0.1, 0.2]);
      const untagged = [0.1, 0.2];
      expect(isHashVector(tagged)).toBe(true);
      expect(isHashVector(untagged)).toBe(false);
      expect(isHashVector('not a vector')).toBe(false);
      expect(isHashVector(null)).toBe(false);
    });

    it('returns the same array so callers keep their reference', () => {
      const vector = [1, 2, 3];
      expect(markHashVector(vector)).toBe(vector);
    });
  });

  describe('EmbeddingsService', () => {
    let service: EmbeddingsService;

    beforeEach(() => {
      service = new EmbeddingsService();
    });

    it('declares vector mode when OpenAI is configured', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      expect(new EmbeddingsService().getMode()).toBe('vector');
    });

    it('declares hash-fallback mode only on explicit opt-in', () => {
      process.env.ALLOW_HASH_EMBEDDINGS = 'true';
      expect(new EmbeddingsService().getMode()).toBe('hash-fallback');
    });

    it('exposes the six snapshot fields', () => {
      const snapshot = service.snapshot();
      expect(Object.keys(snapshot).sort()).toEqual(
        [
          'allowHashEmbeddings',
          'lastDegradedAt',
          'lastEmbeddingSuccessAt',
          'mode',
          'model',
          'openaiConfigured',
        ].sort(),
      );
      expect(snapshot.lastEmbeddingSuccessAt).toBeNull();
      expect(snapshot.lastDegradedAt).toBeNull();
    });

    it('records a vector success', () => {
      process.env.ALLOW_HASH_EMBEDDINGS = 'true';
      const degraded = new EmbeddingsService();
      degraded.recordDegraded('missing-key', 'no key', true);
      expect(degraded.getMode()).toBe('hash-fallback');

      degraded.recordVectorSuccess();
      expect(degraded.getMode()).toBe('vector');
      expect(degraded.snapshot().lastEmbeddingSuccessAt).not.toBeNull();
      expect(degraded.snapshot().lastDegradedAt).not.toBeNull();
    });

    it('reports keyword-degraded retrieval with no key and no opt-in', () => {
      expect(service.retrievalModeNow()).toBe('keyword-degraded');
    });

    it('reports hash-fallback retrieval once hash vectors are served', () => {
      process.env.ALLOW_HASH_EMBEDDINGS = 'true';
      const hashService = new EmbeddingsService();
      hashService.recordDegraded('missing-key', 'no key', true);
      expect(hashService.retrievalModeNow()).toBe('hash-fallback');
    });

    it('warns once per process for each degradation marker', () => {
      const warn = jest.spyOn(require('@nestjs/common').Logger.prototype, 'warn').mockImplementation(() => undefined);
      const fresh = new EmbeddingsService();

      fresh.recordDegraded('missing-key', 'first');
      fresh.recordDegraded('provider-error', 'second');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('EMBEDDINGS_DEGRADED');
      expect(warn.mock.calls[0][0]).toContain('reason=missing-key');

      fresh.recordRetrievalDegraded('keyword-degraded', 'a');
      fresh.recordRetrievalDegraded('keyword-degraded', 'b');
      expect(warn).toHaveBeenCalledTimes(2);
      expect(warn.mock.calls[1][0]).toContain('RETRIEVAL_DEGRADED');
      expect(warn.mock.calls[1][0]).toContain('mode=keyword-degraded');

      warn.mockRestore();
    });

    it('logs the startup line on module init', () => {
      const log = jest.spyOn(require('@nestjs/common').Logger.prototype, 'log').mockImplementation(() => undefined);
      new EmbeddingsService().onModuleInit();
      expect(log.mock.calls[0][0]).toBe('embeddings: configured=false mode=vector allowHash=false');
      log.mockRestore();
    });
  });
});
