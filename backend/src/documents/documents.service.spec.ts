import { Test } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { StoreService } from '../common/store.service';
import { AIService } from '../ai/ai.service';
import { EmbeddingsUnavailableError } from '../ai/embeddings.service';

jest.mock('pdf-parse');

const pdfParse = require('pdf-parse');

describe('DocumentsService upload', () => {
  const saved = { ...process.env };
  let store: any;
  let ai: any;
  let service: DocumentsService;

  const file = (name = 'scan.pdf', size = 2048): Express.Multer.File =>
    ({
      originalname: name,
      mimetype: 'application/pdf',
      size,
      buffer: Buffer.from('%PDF-1.4'),
    } as unknown as Express.Multer.File);

  const makeDoc = (overrides: Record<string, any> = {}) => ({
    id: 'doc-1',
    companyId: 'co-1',
    title: 'scan',
    filename: 'scan.pdf',
    mime: 'application/pdf',
    sizeBytes: 2048,
    file: null,
    content: '',
    pageCount: 0,
    status: 'processing',
    summary: null,
    published: false,
    error: null,
    ingestWarning: null,
    isSample: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    pdfParse.mockReset();
    store = {
      createDocument: jest.fn(async (data: any) => makeDoc(data)),
      updateDocument: jest.fn(async (id: string, data: any) => makeDoc({ id, ...data })),
      findDocumentById: jest.fn(async () => makeDoc({ id: 'doc-1', content: 'text', status: 'ready' })),
      insertChunk: jest.fn(async () => undefined),
      deleteChunksByDocument: jest.fn(async () => undefined),
      logAsk: jest.fn(async () => undefined),
    };
    ai = {
      generateEmbedding: jest.fn(async () => new Array(1536).fill(0.1)),
      currentRetrievalMode: jest.fn(() => 'vector' as const),
      askDocument: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: StoreService, useValue: store },
        { provide: AIService, useValue: ai },
      ],
    }).compile();
    service = module.get(DocumentsService);
  });

  afterAll(() => {
    process.env = saved;
  });

  describe('scanned / image-only PDFs are rejected', () => {
    it('rejects a PDF that extracts to nothing, naming OCR as the reason', async () => {
      pdfParse.mockResolvedValue({ text: '', numpages: 12 });
      const doc = (await service.upload('co-1', file()))!;
      expect(doc.status).toBe('failed');
      expect(doc.error).toMatch(/scanned or image-only/);
      expect(doc.error).toMatch(/OCR is required/);
    });

    it('rejects a whitespace-only extraction', async () => {
      pdfParse.mockResolvedValue({ text: '  \n \t ', numpages: 3 });
      const doc = (await service.upload('co-1', file()))!;
      expect(doc.status).toBe('failed');
      expect(doc.error).toMatch(/OCR is required/);
    });

    it('rejects when text per page is below the threshold', async () => {
      pdfParse.mockResolvedValue({ text: 'Page 1 of 60', numpages: 60 });
      const doc = (await service.upload('co-1', file()))!;
      expect(doc.status).toBe('failed');
    });

    it('never burns an embedding call on a rejected upload', async () => {
      pdfParse.mockResolvedValue({ text: '', numpages: 40 });
      await service.upload('co-1', file());
      expect(ai.generateEmbedding).not.toHaveBeenCalled();
      expect(store.insertChunk).not.toHaveBeenCalled();
    });

    it('never publishes a rejected document, even when asked to', async () => {
      pdfParse.mockResolvedValue({ text: '', numpages: 5 });
      const doc = (await service.upload('co-1', file(), { published: true }))!;
      expect(doc.published).toBe(false);
      expect(store.createDocument.mock.calls[0][0].published).toBe(false);
    });

    it('reports an unreadable PDF as such, not as scanned', async () => {
      pdfParse.mockRejectedValue(new Error('bad header'));
      const doc = (await service.upload('co-1', file()))!;
      expect(doc.status).toBe('failed');
      expect(doc.error).toMatch(/could not be read/);
    });
  });

  describe('low text density warns but does not reject', () => {
    it('indexes a thin PDF and records the warning on the document', async () => {
      // 164 characters over 3 pages = ~55 chars/page: usable, but sparse.
      pdfParse.mockResolvedValue({
        text: 'Total 1,200 | Ref A-9 | Q3 | Net | 2026 |'.repeat(4),
        numpages: 3,
      });
      const doc = (await service.upload('co-1', file('sparse.pdf')))!;
      expect(doc.status).toBe('ready');
      expect(doc.error).toBeNull();
      expect(doc.ingestWarning).toMatch(/Low text density/);
      expect(store.createDocument.mock.calls[0][0].ingestWarning).toMatch(/Low text density/);
      expect(store.insertChunk).toHaveBeenCalled();
    });

    it('records no warning for a normal text PDF', async () => {
      pdfParse.mockResolvedValue({ text: 'word '.repeat(4000), numpages: 10 });
      const doc = (await service.upload('co-1', file('normal.pdf')))!;
      expect(doc.status).toBe('ready');
      expect(doc.ingestWarning).toBeNull();
    });
  });

  describe('embedding degradation never fails the upload', () => {
    it('stores keyword-only chunks when embeddings are unavailable', async () => {
      pdfParse.mockResolvedValue({ text: 'word '.repeat(4000), numpages: 10 });
      ai.generateEmbedding.mockRejectedValue(
        new EmbeddingsUnavailableError('OPENAI_API_KEY is not set', 'missing-key'),
      );
      const doc = (await service.upload('co-1', file('x.pdf')))!;
      expect(doc.status).toBe('ready');
      expect(store.insertChunk).toHaveBeenCalled();
      for (const call of store.insertChunk.mock.calls) {
        expect(call[0].embedding).toBeNull();
      }
    });

    it('stops calling the provider after the first EmbeddingsUnavailableError', async () => {
      pdfParse.mockResolvedValue({ text: Array.from({ length: 30 }, () => 'sentence here about retention. ').join(' '), numpages: 1 });
      ai.generateEmbedding.mockRejectedValue(new EmbeddingsUnavailableError('nope', 'missing-key'));
      await service.upload('co-1', file('y.pdf'));
      expect(ai.generateEmbedding).toHaveBeenCalledTimes(1);
    });

    it('still fails the upload for a non-embeddings error', async () => {
      pdfParse.mockResolvedValue({ text: 'word '.repeat(4000), numpages: 10 });
      ai.generateEmbedding.mockRejectedValue(new Error('disk on fire'));
      const doc = (await service.upload('co-1', file('z.pdf')))!;
      expect(doc.status).toBe('failed');
      expect(doc.error).toMatch(/disk on fire/);
    });
  });

  describe('reindex', () => {
    it('uses the same degraded-safe indexing path', async () => {
      store.findDocumentById.mockResolvedValue(makeDoc({ id: 'doc-9', content: 'word '.repeat(4000), pageCount: 10, status: 'ready' }));
      ai.generateEmbedding.mockRejectedValue(new EmbeddingsUnavailableError('nope', 'missing-key'));
      const doc = (await service.reindex('co-1', 'doc-9'))!;
      expect(doc.status).toBe('ready');
      expect(store.insertChunk.mock.calls[0][0].embedding).toBeNull();
    });

    it('refuses to reindex a scanned document instead of writing an empty index', async () => {
      store.findDocumentById.mockResolvedValue(makeDoc({ id: 'doc-10', content: '', pageCount: 30, status: 'failed' }));
      const doc = (await service.reindex('co-1', 'doc-10'))!;
      expect(doc.status).toBe('failed');
      expect(doc.error).toMatch(/OCR is required/);
      expect(store.insertChunk).not.toHaveBeenCalled();
      expect(store.deleteChunksByDocument).not.toHaveBeenCalled();
    });
  });

  describe('summarize reports the retrieval mode', () => {
    it('includes retrievalMode on a fresh summary', async () => {
      const aiModule = await Test.createTestingModule({
        providers: [DocumentsService, { provide: StoreService, useValue: store }, { provide: AIService, useValue: ai }],
      }).compile();
      const svc = aiModule.get(DocumentsService);
      ai.summarizeDocument = jest.fn(async () => 'A summary.');
      const result = await svc.summarize('co-1', 'doc-1');
      expect(result).toEqual({ summary: 'A summary.', cached: false, retrievalMode: 'vector' });
    });
  });
});
