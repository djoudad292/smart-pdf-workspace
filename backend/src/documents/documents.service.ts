import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import pdfParse from 'pdf-parse';
import { StoreService } from '../common/store.service';
import { AIService } from '../ai/ai.service';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private store: StoreService,
    private aiService: AIService,
  ) {}

  async upload(companyId: string, file?: Express.Multer.File) {
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
    try {
      const parsed = await pdfParse(file.buffer);
      content = (parsed.text || '').trim();
      pageCount = parsed.numpages || 0;
    } catch (err) {
      this.logger.warn(`PDF extraction failed for ${file.originalname}: ${(err as Error).message}`);
    }

    const title = file.originalname.replace(/\.pdf$/i, '') || 'Untitled';
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
      status: content ? 'processing' : 'failed',
      published: false,
      error: content ? null : 'No readable text was extracted. The PDF may be scanned or image-only.',
    });

    if (content) {
      const chunks = this.chunkContent(content);
      try {
        for (let i = 0; i < chunks.length; i++) {
          const embedding = await this.aiService.generateEmbedding(chunks[i]);
          await this.store.insertChunk({
            id: crypto.randomUUID(),
            documentId: document.id,
            companyId,
            chunkIndex: i,
            chunkText: chunks[i],
            embedding,
          });
        }
        return this.store.updateDocument(document.id, { status: 'ready', error: null });
      } catch (err) {
        this.logger.error(`Embedding failed for ${document.id}: ${(err as Error).message}`);
        return this.store.updateDocument(document.id, { status: 'failed', error: (err as Error).message });
      }
    }

    return this.store.findDocumentById(document.id);
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
    return this.aiService.askDocument(companyId, documentId, question.trim());
  }

  async summarize(companyId: string, documentId: string, force = false) {
    const doc = await this.assertDocumentInCompany(documentId, companyId);
    if (doc.status !== 'ready') {
      throw new BadRequestException('This document is not ready yet. It may still be processing or have failed to extract text.');
    }
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
    await this.store.deleteChunksByDocument(documentId);
    const chunks = this.chunkContent(doc.content);
    if (chunks.length === 0) {
      return this.store.updateDocument(documentId, { status: 'failed', error: 'No readable text to index.' });
    }
    try {
      for (let i = 0; i < chunks.length; i++) {
        const embedding = await this.aiService.generateEmbedding(chunks[i]);
        await this.store.insertChunk({
          id: crypto.randomUUID(),
          documentId,
          companyId,
          chunkIndex: i,
          chunkText: chunks[i],
          embedding,
        });
      }
      return this.store.updateDocument(documentId, { status: 'ready', error: null });
    } catch (err) {
      this.logger.error(`Reindex failed for ${documentId}: ${(err as Error).message}`);
      return this.store.updateDocument(documentId, { status: 'failed', error: (err as Error).message });
    }
  }

  private chunkContent(content: string): string[] {
    const paragraphs = content.split(/\n\s*\n/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) continue;

      if (currentChunk.length + trimmed.length > 500 && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      if (trimmed.length > 500) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        for (let i = 0; i < trimmed.length; i += 400) {
          chunks.push(trimmed.slice(i, i + 500));
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [content];
  }
}
