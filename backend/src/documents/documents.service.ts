import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import pdfParse from 'pdf-parse';
import { StoreService } from '../common/store.service';
import { AIService } from '../ai/ai.service';
import { isEmbeddingsUnavailableError } from '../ai/embeddings.service';
import { analyzeExtraction } from './pdf-quality';
import { chunkText } from './chunking';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private store: StoreService,
    private aiService: AIService,
  ) {}

  async upload(companyId: string, file?: Express.Multer.File, options: { published?: boolean } = {}) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file uploaded');
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new BadRequestException('File must be under 10MB');
    }
    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    const mime = file.mimetype || '';
    if (mime !== 'application/pdf' && ext !== 'pdf') {
      throw new BadRequestException('Only PDF files are supported');
    }

    let content = '';
    let pageCount = 0;
    let extractionFailed = false;
    try {
      const parsed = await pdfParse(file.buffer);
      content = (parsed.text || '').trim();
      pageCount = parsed.numpages || 0;
    } catch (err) {
      extractionFailed = true;
      this.logger.warn(`PDF extraction failed for ${file.originalname}: ${(err as Error).message}`);
    }

    // Quality gate before any chunking or embedding: pdf-parse has no OCR, so a
    // scanned PDF extracts to nothing and would otherwise be indexed as an empty
    // document that answers questions with no sources.
    const quality = analyzeExtraction(content, pageCount);
    const title = file.originalname.replace(/\.pdf$/i, '') || 'Untitled';
    const rejected = extractionFailed || quality.rejected;
    const reason = extractionFailed
      ? 'The PDF could not be read. The file may be corrupt or password-protected.'
      : quality.reason;

    if (rejected) {
      this.logger.warn(`Rejected ${file.originalname}: ${reason}`);
    } else if (quality.warning) {
      this.logger.warn(`Low text density in ${file.originalname}: ${quality.warning}`);
    }

    const document = await this.store.createDocument({
      id: crypto.randomUUID(),
      companyId,
      title,
      filename: file.originalname,
      mime: 'application/pdf',
      sizeBytes: file.size,
      file: file.buffer,
      content,
      pageCount,
      status: rejected ? 'failed' : 'processing',
      // A rejected document is never published, whatever the caller asked for.
      published: false,
      error: reason || null,
      ingestWarning: rejected ? null : quality.warning || null,
    });

    if (rejected) {
      return this.store.updateDocument(document.id, { status: 'failed', error: reason });
    }

    const chunks = this.chunkContent(content);
    try {
      await this.indexChunks(companyId, document.id, chunks);
      return this.store.updateDocument(document.id, {
        status: 'ready',
        error: null,
        // Re-asserted on the response so the upload result carries the warning.
        ingestWarning: quality.warning || null,
        published: options.published === true,
      });
    } catch (err) {
      this.logger.error(`Indexing failed for ${document.id}: ${(err as Error).message}`);
      return this.store.updateDocument(document.id, { status: 'failed', error: (err as Error).message });
    }
  }

  /**
   * Chunk + embed. When the embedding provider is unavailable the chunks are
   * stored with a null embedding instead of a hash vector: the upload still
   * succeeds and stays keyword-searchable, and no nonsense vector ever reaches
   * pgvector.
   */
  private async indexChunks(companyId: string, documentId: string, chunks: string[]): Promise<void> {
    let embeddingDegraded = false;
    for (let i = 0; i < chunks.length; i++) {
      let embedding: number[] | null = null;
      if (!embeddingDegraded) {
        try {
          embedding = await this.aiService.generateEmbedding(chunks[i]);
        } catch (err) {
          if (!isEmbeddingsUnavailableError(err)) throw err;
          embeddingDegraded = true;
          this.logger.warn(
            `Embeddings unavailable, storing ${chunks.length} chunk(s) keyword-only: ${(err as Error).message}`,
          );
        }
      }
      await this.store.insertChunk({
        id: crypto.randomUUID(),
        documentId,
        companyId,
        chunkIndex: i,
        chunkText: chunks[i],
        embedding,
      });
    }
  }

  getDocuments(companyId: string, page = 1, limit = 50) {
    return this.store.findDocumentsByCompany(companyId, page, limit);
  }

  async assertDocumentInCompany(id: string, companyId: string) {
    const doc = await this.store.findDocumentById(id);
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    if (doc.companyId !== companyId) {
      throw new ForbiddenException('You do not have access to this document');
    }
    return doc;
  }

  async delete(id: string, companyId: string) {
    await this.assertDocumentInCompany(id, companyId);
    await this.store.deleteChunksByDocument(id);
    await this.store.deleteDocument(id);
    return { success: true };
  }

  async ask(companyId: string, documentId: string, question: string) {
    if (!question || typeof question !== 'string' || !question.trim()) {
      throw new BadRequestException('A question is required');
    }
    const doc = await this.assertDocumentInCompany(documentId, companyId);
    if (doc.status !== 'ready') {
      throw new BadRequestException('This document is not ready yet. It may still be processing or have failed to extract text.');
    }
    const result = await this.aiService.askDocument(companyId, documentId, question.trim());
    this.store.logAsk(companyId, 'document', question.trim()).catch((err) => {
      this.logger.warn(`Failed to log ask: ${(err as Error).message}`);
    });
    return result;
  }

  async summarize(companyId: string, documentId: string, force = false) {
    const doc = await this.assertDocumentInCompany(documentId, companyId);
    if (doc.status !== 'ready') {
      throw new BadRequestException('This document is not ready yet. It may still be processing or have failed to extract text.');
    }
    // No retrievalMode here: summarization reads the whole document, so no
    // retrieval ran and there is no mode to report. Answer endpoints that do
    // retrieve (/documents/:id/ask, /widget/ask) still carry it.
    if (doc.summary && !force) {
      return { summary: doc.summary, cached: true };
    }
    const summary = await this.aiService.summarizeDocument(companyId, documentId);
    await this.store.updateDocument(documentId, { summary });
    return { summary, cached: false };
  }

  async setPublished(id: string, companyId: string, published: boolean) {
    const doc = await this.assertDocumentInCompany(id, companyId);
    if (published && doc.status !== 'ready') {
      throw new BadRequestException('Only documents that finished processing can be published');
    }
    return this.store.updateDocument(id, { published });
  }

  async reindex(companyId: string, documentId: string) {
    const doc = await this.assertDocumentInCompany(documentId, companyId);
    // Same quality gate as upload: reindexing a scanned PDF would only produce
    // an empty, unanswerable index.
    const quality = analyzeExtraction(doc.content, doc.pageCount);
    if (quality.rejected) {
      return this.store.updateDocument(documentId, { status: 'failed', error: quality.reason });
    }
    await this.store.deleteChunksByDocument(documentId);
    const chunks = this.chunkContent(doc.content);
    try {
      await this.indexChunks(companyId, documentId, chunks);
      return this.store.updateDocument(documentId, {
        status: 'ready',
        error: null,
        ingestWarning: quality.warning || null,
      });
    } catch (err) {
      this.logger.error(`Reindex failed for ${documentId}: ${(err as Error).message}`);
      return this.store.updateDocument(documentId, { status: 'failed', error: (err as Error).message });
    }
  }

  /** Split extracted text into sentence-aware retrieval chunks. */
  chunkContent(content: string): string[] {
    return chunkText(content);
  }
}
