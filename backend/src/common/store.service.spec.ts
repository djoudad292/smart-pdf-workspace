import { Test } from '@nestjs/testing';
import { StoreService } from './store.service';
import { DatabaseService } from './database.service';
import { EmbeddingsUnavailableError, isHashVector, markHashVector } from '../ai/embeddings.service';

describe('StoreService vector guard', () => {
  let store: StoreService;
  let db: { query: jest.Mock; queryOne: jest.Mock; execute: jest.Mock };

  beforeEach(async () => {
    db = { query: jest.fn().mockResolvedValue([]), queryOne: jest.fn().mockResolvedValue(null), execute: jest.fn().mockResolvedValue(undefined) };
    const module = await Test.createTestingModule({
      providers: [StoreService, { provide: DatabaseService, useValue: db }],
    }).compile();
    store = module.get(StoreService);
  });

  it('refuses a hash-fallback vector in the document vector search', async () => {
    const vector = markHashVector(new Array(1536).fill(0.01));
    expect(isHashVector(vector)).toBe(true);
    await expect(store.searchChunksByDocument('doc-1', vector, 5, 0.25)).rejects.toThrow(
      EmbeddingsUnavailableError,
    );
    expect(db.query).not.toHaveBeenCalled();
  });

  it('refuses a hash-fallback vector in the company vector search', async () => {
    const vector = markHashVector(new Array(1536).fill(0.02));
    await expect(store.searchChunksByCompany('co-1', vector, 6, 0.25, true)).rejects.toThrow(
      /hash-fallback embedding/,
    );
    expect(db.query).not.toHaveBeenCalled();
  });

  it('refuses a hash-fallback vector even when a threshold would pass everything', async () => {
    const vector = markHashVector(new Array(1536).fill(0));
    await expect(store.searchChunksByDocument('doc-1', vector, 5, -1)).rejects.toThrow(
      EmbeddingsUnavailableError,
    );
    expect(db.query).not.toHaveBeenCalled();
  });

  it('lets a real vector through to pgvector', async () => {
    const vector = new Array(1536).fill(0.03);
    expect(isHashVector(vector)).toBe(false);
    await store.searchChunksByDocument('doc-1', vector, 5, 0.25);
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][0]).toContain('<=>');
  });

  it('stores a null embedding instead of JSON for keyword-only chunks', async () => {
    await store.insertChunk({
      id: 'c1',
      documentId: 'doc-1',
      companyId: 'co-1',
      chunkIndex: 0,
      chunkText: 'hello',
      embedding: null,
    });
    const params = db.execute.mock.calls[0][1];
    expect(params[params.length - 1]).toBeNull();
  });

  it('serialises a real embedding for storage', async () => {
    await store.insertChunk({
      id: 'c1',
      documentId: 'doc-1',
      companyId: 'co-1',
      chunkIndex: 0,
      chunkText: 'hello',
      embedding: [0.1, 0.2],
    });
    const params = db.execute.mock.calls[0][1];
    expect(params[params.length - 1]).toBe('[0.1,0.2]');
  });

  it('scores keyword hits by matched-term ratio, not a constant 1', async () => {
    await store.searchChunksByDocumentKeyword('doc-1', ['alpha', 'beta'], 5);
    const sql = db.query.mock.calls[0][0] as string;
    expect(sql).toContain(
      'ROUND((((c.chunk_text ILIKE $2)::int + (c.chunk_text ILIKE $3)::int)::numeric / 2), 4)::float8 AS similarity',
    );
    expect(sql).not.toMatch(/1 AS similarity/);
  });

  it('returns no keyword hits without terms and never queries', async () => {
    await expect(store.searchChunksByCompanyKeyword('co-1', [], 6, true)).resolves.toEqual([]);
    await expect(store.searchChunksByDocumentKeyword('doc-1', [], 5)).resolves.toEqual([]);
    expect(db.query).not.toHaveBeenCalled();
  });
});
