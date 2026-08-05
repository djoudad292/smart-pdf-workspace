import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';

const SCHEMA_STATEMENTS: string[] = [
  `CREATE EXTENSION IF NOT EXISTS vector`,
  `CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    plan TEXT DEFAULT 'free',
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'AGENT',
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    token_version INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    is_online BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    filename TEXT,
    mime TEXT,
    size_bytes INT DEFAULT 0,
    file BYTEA,
    content TEXT NOT NULL DEFAULT '',
    page_count INT DEFAULT 0,
    status TEXT DEFAULT 'processing',
    summary TEXT,
    published BOOLEAN DEFAULT false,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS document_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_document_chunks_document ON document_chunks(document_id)`,
  `CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id)`,
  `CREATE TABLE IF NOT EXISTS password_resets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash)`,
  `CREATE TABLE IF NOT EXISTS ask_logs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    source TEXT DEFAULT 'document',
    question TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ask_logs_company ON ask_logs(company_id)`,
];

const HNSW_INDEX_STATEMENT = `CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx ON document_chunks USING hnsw (embedding vector_cosine_ops)`;

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;
  private initialized = false;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
    });
    this.pool.on('error', (err) => {
      this.logger.error('Unexpected pg pool error', err.message);
    });
  }

  async initialize() {
    if (this.initialized) return;
    await this.pool.query('SELECT 1');
    for (const stmt of SCHEMA_STATEMENTS) {
      try {
        await this.pool.query(stmt);
      } catch (err) {
        this.logger.warn(`Schema statement failed (continuing): ${(err as Error).message}`);
      }
    }
    try {
      await this.pool.query(HNSW_INDEX_STATEMENT);
    } catch (err) {
      this.logger.warn(`HNSW index skipped (falling back to exact search): ${(err as Error).message}`);
    }
    this.initialized = true;
    this.logger.log('Database schema ready');
  }

  async query<T extends Record<string, any> = any>(text: string, params?: any[]): Promise<T[]> {
    const result = await this.pool.query(text, params);
    return result.rows as T[];
  }

  async queryOne<T extends Record<string, any> = any>(text: string, params?: any[]): Promise<T | null> {
    const rows = await this.query<T>(text, params);
    return rows[0] ?? null;
  }

  async execute(text: string, params?: any[]): Promise<void> {
    await this.pool.query(text, params);
  }
}
