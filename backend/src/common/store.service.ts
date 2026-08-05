import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

export type StoredUser = {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
  companyId?: string;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
};

export type StoredCompany = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
};

export type StoredAgent = {
  id: string;
  userId: string;
  companyId: string;
  isOnline: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type StoredDocument = {
  id: string;
  companyId: string;
  title: string;
  filename?: string | null;
  mime?: string | null;
  sizeBytes: number;
  file?: Buffer | null;
  content: string;
  pageCount: number;
  status: string;
  summary?: string | null;
  published: boolean;
  error?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StoredChunk = {
  id: string;
  documentId: string;
  companyId: string;
  chunkIndex: number;
  chunkText: string;
  embedding: number[];
  createdAt: Date;
};

@Injectable()
export class StoreService {
  constructor(private db: DatabaseService) {}

  // Users
  async createUser(data: Omit<StoredUser, 'createdAt' | 'updatedAt' | 'tokenVersion'>): Promise<StoredUser> {
    const rows = await this.db.query<StoredUser>(
      `INSERT INTO users (id, email, password_hash, name, role, company_id, token_version, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 0, now(), now())
       RETURNING id, email, password_hash AS password, name, role, company_id AS "companyId", token_version AS "tokenVersion", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [data.id, data.email, data.password, data.name, data.role, data.companyId || null],
    );
    return rows[0];
  }

  async findUserByEmail(email: string): Promise<StoredUser | null> {
    return this.db.queryOne<StoredUser>(
      `SELECT id, email, password_hash AS password, name, role, company_id AS "companyId", token_version AS "tokenVersion", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM users WHERE email = $1`,
      [email],
    );
  }

  async findUserById(id: string): Promise<StoredUser | null> {
    return this.db.queryOne<StoredUser>(
      `SELECT id, email, password_hash AS password, name, role, company_id AS "companyId", token_version AS "tokenVersion", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM users WHERE id = $1`,
      [id],
    );
  }

  async findAllUsers(): Promise<StoredUser[]> {
    return this.db.query<StoredUser>(
      `SELECT id, email, password_hash AS password, name, role, company_id AS "companyId", token_version AS "tokenVersion", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM users ORDER BY created_at DESC`,
    );
  }

  async revokeUserTokens(id: string): Promise<void> {
    await this.db.execute(
      `UPDATE users SET token_version = token_version + 1, updated_at = now() WHERE id = $1`,
      [id],
    );
  }

  async deleteUser(id: string): Promise<void> {
    await this.db.execute(`DELETE FROM users WHERE id = $1`, [id]);
  }

  async deleteAgentByUserId(userId: string): Promise<void> {
    await this.db.execute(`DELETE FROM agents WHERE user_id = $1`, [userId]);
  }

  async updatePassword(id: string, hashed: string): Promise<void> {
    await this.db.execute(
      `UPDATE users SET password_hash = $2, token_version = token_version + 1, updated_at = now() WHERE id = $1`,
      [id, hashed],
    );
  }

  async updateUser(id: string, data: Partial<Pick<StoredUser, 'name' | 'email' | 'role' | 'password'>>): Promise<StoredUser | null> {
    const sets: string[] = [];
    const params: any[] = [id];
    let i = 2;
    if (data.name !== undefined) { sets.push(`name = $${i++}`); params.push(data.name); }
    if (data.email !== undefined) { sets.push(`email = $${i++}`); params.push(data.email); }
    if (data.role !== undefined) { sets.push(`role = $${i++}`); params.push(data.role); }
    if (data.password !== undefined) { sets.push(`password_hash = $${i++}`); params.push(data.password); }
    if (sets.length === 0) return this.findUserById(id);
    sets.push('updated_at = now()');
    return this.db.queryOne<StoredUser>(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $1
       RETURNING id, email, password_hash AS password, name, role, company_id AS "companyId", token_version AS "tokenVersion", created_at AS "createdAt", updated_at AS "updatedAt"`,
      params,
    );
  }

  // Password resets
  async createPasswordReset(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.db.execute(
      `INSERT INTO password_resets (id, user_id, token_hash, expires_at, used)
       VALUES ($1, $2, $3, $4, false)`,
      [crypto.randomUUID(), userId, tokenHash, expiresAt],
    );
  }

  async consumePasswordReset(tokenHash: string): Promise<StoredUser | null> {
    const row = await this.db.queryOne<{ userId: string }>(
      `SELECT user_id AS "userId" FROM password_resets
       WHERE token_hash = $1 AND used = false AND expires_at > now()
       ORDER BY created_at DESC LIMIT 1`,
      [tokenHash],
    );
    if (!row) return null;
    await this.db.execute(`UPDATE password_resets SET used = true WHERE token_hash = $1`, [tokenHash]);
    return this.findUserById(row.userId);
  }

  // Companies
  async createCompany(data: Omit<StoredCompany, 'createdAt' | 'updatedAt'>): Promise<StoredCompany> {
    const rows = await this.db.query<StoredCompany>(
      `INSERT INTO companies (id, name, slug, plan, settings, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, now(), now())
       RETURNING id, name, slug, plan, settings, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [data.id, data.name, data.slug, data.plan, JSON.stringify(data.settings || {})],
    );
    return rows[0];
  }

  async findCompanyById(id: string): Promise<StoredCompany | null> {
    return this.db.queryOne<StoredCompany>(
      `SELECT id, name, slug, plan, settings, created_at AS "createdAt", updated_at AS "updatedAt" FROM companies WHERE id = $1`,
      [id],
    );
  }

  async findCompanyBySlug(slug: string): Promise<StoredCompany | null> {
    return this.db.queryOne<StoredCompany>(
      `SELECT id, name, slug, plan, settings, created_at AS "createdAt", updated_at AS "updatedAt" FROM companies WHERE slug = $1`,
      [slug],
    );
  }

  async updateCompanySettings(id: string, settings: Record<string, any>): Promise<StoredCompany | null> {
    return this.db.queryOne<StoredCompany>(
      `UPDATE companies SET settings = settings || $2::jsonb, updated_at = now()
       WHERE id = $1
       RETURNING id, name, slug, plan, settings, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id, JSON.stringify(settings)],
    );
  }

  // Agents
  async createAgent(data: Omit<StoredAgent, 'createdAt' | 'updatedAt'>): Promise<StoredAgent> {
    const rows = await this.db.query<StoredAgent>(
      `INSERT INTO agents (id, user_id, company_id, is_online, created_at, updated_at)
       VALUES ($1, $2, $3, $4, now(), now())
       RETURNING id, user_id AS "userId", company_id AS "companyId", is_online AS "isOnline", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [data.id, data.userId, data.companyId, data.isOnline],
    );
    return rows[0];
  }

  async findAgentByUserId(userId: string): Promise<StoredAgent | null> {
    return this.db.queryOne<StoredAgent>(
      `SELECT id, user_id AS "userId", company_id AS "companyId", is_online AS "isOnline", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM agents WHERE user_id = $1`,
      [userId],
    );
  }

  async findAgentById(id: string): Promise<StoredAgent | null> {
    return this.db.queryOne<StoredAgent>(
      `SELECT id, user_id AS "userId", company_id AS "companyId", is_online AS "isOnline", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM agents WHERE id = $1`,
      [id],
    );
  }

  async findAgentsByCompany(companyId: string): Promise<StoredAgent[]> {
    return this.db.query<StoredAgent>(
      `SELECT id, user_id AS "userId", company_id AS "companyId", is_online AS "isOnline", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM agents WHERE company_id = $1`,
      [companyId],
    );
  }

  async updateAgent(id: string, data: Partial<StoredAgent>): Promise<StoredAgent | null> {
    const sets: string[] = ['updated_at = now()'];
    const params: any[] = [id];
    let i = 2;
    if (data.isOnline !== undefined) { sets.push(`is_online = $${i++}`); params.push(data.isOnline); }
    return this.db.queryOne<StoredAgent>(
      `UPDATE agents SET ${sets.join(', ')} WHERE id = $1
       RETURNING id, user_id AS "userId", company_id AS "companyId", is_online AS "isOnline", created_at AS "createdAt", updated_at AS "updatedAt"`,
      params,
    );
  }

  // Documents
  async createDocument(data: Omit<StoredDocument, 'createdAt' | 'updatedAt'>): Promise<StoredDocument> {
    const rows = await this.db.query<StoredDocument>(
      `INSERT INTO documents (id, company_id, title, filename, mime, size_bytes, file, content, page_count, status, summary, published, error, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now(), now())
       RETURNING id, company_id AS "companyId", title, filename, mime, size_bytes AS "sizeBytes", file, content, page_count AS "pageCount", status, summary, published, error, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        data.id,
        data.companyId,
        data.title,
        data.filename || null,
        data.mime || null,
        data.sizeBytes,
        data.file || null,
        data.content,
        data.pageCount,
        data.status,
        data.summary || null,
        data.published,
        data.error || null,
      ],
    );
    return rows[0];
  }

  async findDocumentById(id: string): Promise<StoredDocument | null> {
    return this.db.queryOne<StoredDocument>(
      `SELECT id, company_id AS "companyId", title, filename, mime, size_bytes AS "sizeBytes", file, content, page_count AS "pageCount", status, summary, published, error, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM documents WHERE id = $1`,
      [id],
    );
  }

  async findDocumentsByCompany(companyId: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const countRow = await this.db.queryOne<{ count: number }>(
      `SELECT count(*)::int AS count FROM documents WHERE company_id = $1`,
      [companyId],
    );
    const rows = await this.db.query<StoredDocument>(
      `SELECT id, company_id AS "companyId", title, filename, mime, size_bytes AS "sizeBytes", content, page_count AS "pageCount", status, summary, published, error, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM documents WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [companyId, limit, offset],
    );
    return { items: rows, total: countRow?.count ?? 0, page, perPage: limit };
  }

  async findPublishedDocuments(companyId: string): Promise<StoredDocument[]> {
    return this.db.query<StoredDocument>(
      `SELECT id, company_id AS "companyId", title, filename, mime, size_bytes AS "sizeBytes", content, page_count AS "pageCount", status, summary, published, error, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM documents WHERE company_id = $1 AND published = true AND status = 'ready' ORDER BY created_at DESC`,
      [companyId],
    );
  }

  async updateDocument(id: string, data: Partial<StoredDocument>): Promise<StoredDocument | null> {
    const sets: string[] = ['updated_at = now()'];
    const params: any[] = [id];
    let i = 2;
    const fields: Record<string, any> = {
      title: 'title',
      content: 'content',
      pageCount: 'page_count',
      status: 'status',
      summary: 'summary',
      published: 'published',
      error: 'error',
    };
    const dataAny = data as Record<string, any>;
    for (const [key, col] of Object.entries(fields)) {
      if (dataAny[key] !== undefined) { sets.push(`${col} = $${i++}`); params.push(dataAny[key]); }
    }
    return this.db.queryOne<StoredDocument>(
      `UPDATE documents SET ${sets.join(', ')} WHERE id = $1
       RETURNING id, company_id AS "companyId", title, filename, mime, size_bytes AS "sizeBytes", file, content, page_count AS "pageCount", status, summary, published, error, created_at AS "createdAt", updated_at AS "updatedAt"`,
      params,
    );
  }

  async deleteDocument(id: string): Promise<void> {
    await this.db.execute(`DELETE FROM documents WHERE id = $1`, [id]);
  }

  async insertChunk(data: Omit<StoredChunk, 'createdAt'>): Promise<void> {
    await this.db.execute(
      `INSERT INTO document_chunks (id, document_id, company_id, chunk_index, chunk_text, embedding, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::vector, now())`,
      [data.id, data.documentId, data.companyId, data.chunkIndex, data.chunkText, JSON.stringify(data.embedding)],
    );
  }

  async deleteChunksByDocument(documentId: string): Promise<void> {
    await this.db.execute(`DELETE FROM document_chunks WHERE document_id = $1`, [documentId]);
  }

  async countChunksByDocument(documentId: string): Promise<number> {
    const row = await this.db.queryOne(
      `SELECT count(*)::int AS count FROM document_chunks WHERE document_id = $1`,
      [documentId],
    );
    return row?.count ?? 0;
  }

  async countChunksByCompany(companyId: string): Promise<number> {
    const row = await this.db.queryOne(
      `SELECT count(*)::int AS count FROM document_chunks WHERE company_id = $1`,
      [companyId],
    );
    return row?.count ?? 0;
  }

  async searchChunksByDocument(documentId: string, embedding: number[], limit = 5, threshold = 0.25) {
    return this.db.query<{ id: string; chunkText: string; documentId: string; similarity: number }>(
      `SELECT id, chunk_text AS "chunkText", document_id AS "documentId",
              ROUND((1 - (embedding <=> $2::vector))::numeric, 4) AS similarity
       FROM document_chunks
       WHERE document_id = $1 AND embedding IS NOT NULL
         AND (1 - (embedding <=> $2::vector)) >= $3
       ORDER BY embedding <=> $2::vector
       LIMIT $4`,
      [documentId, JSON.stringify(embedding), threshold, limit],
    );
  }

  async searchChunksByCompany(companyId: string, embedding: number[], limit = 6, threshold = 0.25) {
    return this.db.query<{ id: string; chunkText: string; documentId: string; documentTitle: string; similarity: number }>(
      `SELECT c.id, c.chunk_text AS "chunkText", c.document_id AS "documentId", d.title AS "documentTitle",
              ROUND((1 - (c.embedding <=> $2::vector))::numeric, 4) AS similarity
       FROM document_chunks c
       JOIN documents d ON d.id = c.document_id
       WHERE c.company_id = $1 AND c.embedding IS NOT NULL AND d.published = true
         AND (1 - (c.embedding <=> $2::vector)) >= $3
       ORDER BY c.embedding <=> $2::vector
       LIMIT $4`,
      [companyId, JSON.stringify(embedding), threshold, limit],
    );
  }

  // Analytics
  async logAsk(companyId: string, source: 'document' | 'widget', question: string): Promise<void> {
    await this.db.execute(
      `INSERT INTO ask_logs (id, company_id, source, question) VALUES ($1, $2, $3, $4)`,
      [crypto.randomUUID(), companyId, source, question],
    );
  }

  async countUsersByCompany(companyId: string): Promise<number> {
    const row = await this.db.queryOne<{ count: number }>(
      `SELECT count(*)::int AS count FROM users WHERE company_id = $1`,
      [companyId],
    );
    return row?.count ?? 0;
  }

  async countAsksByCompany(companyId: string): Promise<number> {
    const row = await this.db.queryOne<{ count: number }>(
      `SELECT count(*)::int AS count FROM ask_logs WHERE company_id = $1`,
      [companyId],
    );
    return row?.count ?? 0;
  }

  async countAsksToday(companyId: string): Promise<number> {
    const row = await this.db.queryOne<{ count: number }>(
      `SELECT count(*)::int AS count FROM ask_logs WHERE company_id = $1 AND created_at >= date_trunc('day', now())`,
      [companyId],
    );
    return row?.count ?? 0;
  }

  async getAsksByDay(companyId: string, days = 14): Promise<{ day: string; count: number }[]> {
    return this.db.query<{ day: string; count: number }>(
      `SELECT to_char(day, 'YYYY-MM-DD') AS day, count(l.id)::int AS count
       FROM generate_series(date_trunc('day', now() - ($2::int - 1) * interval '1 day'), date_trunc('day', now()), '1 day'::interval) AS day
       LEFT JOIN ask_logs l ON date_trunc('day', l.created_at) = day AND l.company_id = $1
       GROUP BY day ORDER BY day`,
      [companyId, days],
    );
  }

  async getRecentAsks(companyId: string, limit = 10): Promise<{ question: string; source: string; createdAt: Date }[]> {
    return this.db.query<{ question: string; source: string; createdAt: Date }>(
      `SELECT question, source, created_at AS "createdAt" FROM ask_logs
       WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [companyId, limit],
    );
  }
}
