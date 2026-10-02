import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  PayloadTooLargeException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { StoreService } from '../common/store.service';
import { AIService } from '../ai/ai.service';
import { isEmbeddingsUnavailableError } from '../ai/embeddings.service';
import { DocumentsService } from '../documents/documents.service';
import { GUEST_SAMPLES } from './guest.samples';

export interface GuestLimits {
  ttlMinutes: number;
  maxFileBytes: number;
  maxUploads: number;
}

export function guestLimits(): GuestLimits {
  const ttlMinutes = Number(process.env.GUEST_TTL_MINUTES) || 120;
  const maxFileMb = Number(process.env.GUEST_MAX_FILE_MB) || 5;
  const maxUploads = Number(process.env.GUEST_MAX_UPLOADS) || 3;
  return { ttlMinutes, maxFileBytes: maxFileMb * 1024 * 1024, maxUploads };
}

/** How often expired sandboxes are reclaimed, regardless of visitor traffic. */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

@Injectable()
export class GuestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GuestService.name);
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(
    private store: StoreService,
    private aiService: AIService,
    private documentsService: DocumentsService,
    private jwtService: JwtService,
  ) {}

  onModuleInit() {
    this.cleanupTimer = setInterval(() => {
      this.purgeExpired().catch((err) =>
        this.logger.warn(`Guest cleanup failed: ${(err as Error).message}`),
      );
    }, CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref?.();
    // Reclaim anything left behind by a previous process before serving.
    this.purgeExpired().catch(() => undefined);
  }

  onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  /** Delete every sandbox whose TTL has passed. Safe to call concurrently. */
  async purgeExpired(): Promise<number> {
    const ids = await this.store.findExpiredGuestCompanyIds();
    let purged = 0;
    for (const id of ids) {
      try {
        await this.store.deleteCompanyCascade(id);
        purged += 1;
      } catch (err) {
        this.logger.warn(`Could not purge guest sandbox ${id}: ${(err as Error).message}`);
      }
    }
    if (purged) this.logger.log(`Purged ${purged} expired guest sandbox(es)`);
    return purged;
  }

  /**
   * Create a fully isolated sandbox: its own company, its own throwaway user,
   * and two pre-seeded sample documents. No visitor shares a sandbox, and no
   * sandbox is visible to tenant accounts.
   */
  async createSession() {
    const { ttlMinutes } = guestLimits();
    const companyId = `guest_${crypto.randomUUID()}`;
    const userId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await this.store.createGuestCompany({
      id: companyId,
      name: 'Guest sandbox',
      slug: `guest-${crypto.randomBytes(8).toString('hex')}`,
      expiresAt,
    });

    // The account exists only to satisfy the multi-tenant schema. The password
    // is random and never exposed, so the sandbox cannot be signed into.
    const guestUser = await this.store.createUser({
      id: userId,
      email: `guest+${userId}@sandbox.invalid`,
      password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
      name: 'Guest',
      role: 'GUEST',
      companyId,
    });

    await this.seedSamples(companyId);

    const token = this.jwtService.sign(
      { sub: guestUser.id, companyId, role: 'GUEST', guest: true },
      { expiresIn: `${ttlMinutes}m` },
    );

    return { token, companyId, expiresAt: expiresAt.toISOString(), limits: guestLimits() };
  }

  async endSession(companyId: string) {
    await this.store.deleteCompanyCascade(companyId);
    return { success: true };
  }

  async listDocuments(companyId: string) {
    const { items } = await this.store.findDocumentsByCompany(companyId, 1, 50);
    const uploads = items.filter((d) => !d.isSample).length;
    return {
      documents: items.map((d) => ({
        id: d.id,
        title: d.title,
        pageCount: d.pageCount,
        sizeBytes: d.sizeBytes,
        status: d.status,
        summary: d.summary,
        ingestWarning: d.ingestWarning,
        isSample: d.isSample === true,
        createdAt: d.createdAt,
      })),
      uploadsUsed: uploads,
      uploadsLeft: Math.max(0, guestLimits().maxUploads - uploads),
    };
  }

  async upload(companyId: string, file?: Express.Multer.File) {
    const { maxFileBytes, maxUploads } = guestLimits();
    if (!file || !file.buffer) {
      throw new BadRequestException('No file uploaded');
    }
    if (file.size > maxFileBytes) {
      throw new PayloadTooLargeException(
        `Guest uploads are limited to ${Math.round(maxFileBytes / (1024 * 1024))}MB`,
      );
    }
    const used = await this.store.countUploadedDocuments(companyId);
    if (used >= maxUploads) {
      throw new ForbiddenException(
        `This sandbox has used all ${maxUploads} uploads. Delete a document or start a new session.`,
      );
    }
    return this.documentsService.upload(companyId, file, { published: false });
  }

  async removeDocument(companyId: string, documentId: string) {
    return this.documentsService.delete(documentId, companyId);
  }

  async summarize(companyId: string, documentId: string) {
    const doc = await this.documentsService.assertDocumentInCompany(documentId, companyId);
    if (doc.status !== 'ready') {
      throw new BadRequestException('This document is not ready to summarize yet.');
    }
    const summary = await this.aiService.summarizeDocument(companyId, documentId);
    await this.store.updateDocument(documentId, { summary });
    return { summary };
  }

  /** Answer a question across every ready document in the sandbox. */
  async ask(companyId: string, question: string) {
    if (typeof question !== 'string' || !question.trim()) {
      throw new BadRequestException('A question is required');
    }
    if (question.length > 1000) {
      throw new BadRequestException('Question is too long (1000 characters max)');
    }
    return this.aiService.askCompanyDocuments(companyId, question.trim(), false);
  }

  private async seedSamples(companyId: string) {
    for (const sample of GUEST_SAMPLES) {
      const document = await this.store.createDocument({
        id: crypto.randomUUID(),
        companyId,
        title: sample.title,
        filename: sample.filename,
        mime: 'text/plain',
        sizeBytes: Buffer.byteLength(sample.content),
        content: sample.content,
        pageCount: 1,
        status: 'ready',
        summary: null,
        published: false,
        error: null,
        isSample: true,
      });

      try {
        const chunks = this.documentsService.chunkContent(sample.content);
        // Null embeddings keep the samples keyword-searchable when the embedding
        // provider is unavailable, so the sandbox still answers questions.
        let degraded = false;
        for (let i = 0; i < chunks.length; i++) {
          let embedding: number[] | null = null;
          if (!degraded) {
            try {
              embedding = await this.aiService.generateEmbedding(chunks[i]);
            } catch (err) {
              if (!isEmbeddingsUnavailableError(err)) throw err;
              degraded = true;
            }
          }
          await this.store.insertChunk({
            id: crypto.randomUUID(),
            documentId: document.id,
            companyId,
            chunkIndex: i,
            chunkText: chunks[i],
            embedding,
          });
        }
        if (degraded) {
          this.logger.warn(
            `Guest samples stored keyword-only (embeddings unavailable) for ${companyId}`,
          );
        }
      } catch (err) {
        this.logger.warn(`Could not index guest sample "${sample.title}": ${(err as Error).message}`);
        await this.store.deleteChunksByDocument(document.id);
        await this.store.deleteDocument(document.id);
      }
    }
  }
}
