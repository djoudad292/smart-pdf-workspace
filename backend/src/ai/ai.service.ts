import { Injectable, Logger } from '@nestjs/common';
import { StoreService } from '../common/store.service';

const EMBEDDING_DIM = 1536;

export interface AskResult {
  answer: string;
  sources: { chunkText: string; similarity: number; documentTitle?: string | null }[];
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(private store: StoreService) {}

  // Embeddings: OpenAI with a local hashing fallback
  async generateEmbedding(text: string): Promise<number[]> {
    if (process.env.OPENAI_API_KEY) {
      try {
        const embedding = await this.withTimeout(this.embedOpenAI(text), 15000);
        if (embedding?.length) return embedding;
      } catch (err) {
        this.logger.warn(`OpenAI embedding failed, using local fallback: ${(err as Error).message}`);
      }
    }
    return this.embedLocally(text);
  }

  private async embedOpenAI(text: string): Promise<number[]> {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
        input: text.replace(/\n/g, ' ').slice(0, 8000),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI embedding HTTP ${res.status}: ${body.slice(0, 150)}`);
    }
    const json: any = await res.json();
    return json.data?.[0]?.embedding;
  }

  private embedLocally(text: string): number[] {
    const vector = new Array(EMBEDDING_DIM).fill(0);
    const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const grams: string[] = [];
    for (const word of normalized.split(/\s+/)) {
      if (!word) continue;
      grams.push(word);
      if (word.length > 2) {
        grams.push(word.slice(0, 5));
        grams.push(word.slice(-5));
      }
    }
    const joined = normalized.replace(/\s+/g, '');
    for (let n = 3; n <= 5; n++) {
      for (let i = 0; i + n <= joined.length; i++) {
        grams.push(joined.slice(i, i + n));
      }
    }
    for (const g of grams) {
      const h = hashString(g);
      const idx = Math.abs(h) % EMBEDDING_DIM;
      vector[idx] += (h & 1) === 0 ? 1 : -1;
    }
    let mag = 0;
    for (const v of vector) mag += v * v;
    mag = Math.sqrt(mag) || 1;
    return vector.map((v) => v / mag);
  }

  // RAG Q&A over a single document
  async askDocument(companyId: string, documentId: string, question: string): Promise<AskResult> {
    const doc = await this.store.findDocumentById(documentId);
    if (!doc || doc.companyId !== companyId) {
      throw new Error('Document not found');
    }
    const embedding = await this.generateEmbedding(question);
    const threshold = process.env.OPENAI_API_KEY ? 0.25 : 0.1;
    let results = await this.store.searchChunksByDocument(documentId, embedding, 5, threshold);
    if (!results.length) {
      results = await this.store.searchChunksByDocument(documentId, embedding, 5, 0.05);
    }
    if (!results.length) {
      results = await this.store.searchChunksByDocumentKeyword(documentId, this.extractTerms(question), 5);
    }
    const context = results
      .map((r) => r.chunkText)
      .join('\n\n')
      .slice(0, 7000);

    if (!results.length || !context) {
      return {
        answer: "I couldn't find relevant information in this document to answer that question. Try rephrasing, or ask about something covered in the document.",
        sources: [],
      };
    }

    const answer = await this.generateAnswer(question, context, doc.title);
    return {
      answer:
        answer ||
        "I couldn't find relevant information in this document to answer that question. Try rephrasing, or ask about something covered in the document.",
      sources: results.map((r) => ({ chunkText: r.chunkText, similarity: r.similarity })),
    };
  }

  // RAG Q&A across all published documents of a company (used by the public widget)
  async askCompanyPublished(companyId: string, question: string): Promise<AskResult> {
    const embedding = await this.generateEmbedding(question);
    const threshold = process.env.OPENAI_API_KEY ? 0.25 : 0.1;
    let results = await this.store.searchChunksByCompany(companyId, embedding, 6, threshold);
    if (!results.length) {
      results = await this.store.searchChunksByCompany(companyId, embedding, 6, 0.05);
    }
    if (!results.length) {
      results = await this.store.searchChunksByCompanyKeyword(companyId, this.extractTerms(question), 6);
    }

    if (!results.length) {
      return {
        answer: "I couldn't find relevant information to answer that question. Try rephrasing, or ask about something covered in the published documents.",
        sources: [],
      };
    }

    const context = results
      .map((r) => `[${r.documentTitle}]\n${r.chunkText}`)
      .join('\n\n')
      .slice(0, 8000);

    const answer = await this.generateAnswer(question, context, 'your documents');
    return {
      answer:
        answer ||
        "I couldn't find relevant information to answer that question. Try rephrasing, or ask about something covered in the published documents.",
      sources: results.map((r) => ({ chunkText: r.chunkText, similarity: r.similarity, documentTitle: r.documentTitle })),
    };
  }

  // Generate a summary for a document
  async summarizeDocument(companyId: string, documentId: string): Promise<string> {
    const doc = await this.store.findDocumentById(documentId);
    if (!doc || doc.companyId !== companyId) {
      throw new Error('Document not found');
    }
    const text = doc.content.slice(0, 12000);
    const summary = await this.generateSummary(text, doc.title);
    return (
      summary ||
      "I couldn't generate a summary for this document. It may be empty or contain only scanned images."
    );
  }

  // LLM chat (OpenRouter)
  private async chat(messages: { role: string; content: string }[]): Promise<string | null> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return null;

    const doFetch = async (): Promise<any> => {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.APP_URL || '',
          'X-Title': 'Smart PDF Workspace',
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash',
          messages,
          max_tokens: 700,
          temperature: 0.3,
        }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`OpenRouter HTTP ${res.status}: ${errBody.slice(0, 200)}`);
      }
      return res.json();
    };

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const json: any = await this.withTimeout(doFetch(), 45000);
        const content = json.choices?.[0]?.message?.content;
        return typeof content === 'string' && content.trim() ? content : null;
      } catch (err) {
        const msg = (err as Error).message;
        const isRetryable = /HTTP 503|HTTP 429|HTTP 5\d\d|request queue is full|temporarily overloaded|rate.?limit/i.test(msg);
        if (isRetryable && attempt < maxRetries) {
          const delay = 1000 * Math.pow(2, attempt - 1);
          this.logger.warn(`OpenRouter retry ${attempt}/${maxRetries - 1} after ${delay}ms: ${msg}`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        this.logger.error(`OpenRouter generation failed: ${msg}`);
        return null;
      }
    }
    return null;
  }

  private async generateAnswer(question: string, context: string, docTitle: string): Promise<string | null> {
    const system = `You are an expert assistant that answers questions strictly from the provided document content.
Answer accurately and concisely (2-6 sentences), in the same language as the question.
If the context does not contain the answer, say so and suggest rephrasing. Never invent facts.
Document: ${docTitle}`;
    return this.chat([
      { role: 'system', content: system },
      { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
    ]);
  }

  private async generateSummary(text: string, docTitle: string): Promise<string | null> {
    const system = `You are an expert document analyst. Write a clear, structured summary of the given document.
Cover the main topics, key points, and any important details. Use short bullet points plus a 2-3 sentence overview.`;
    return this.chat([
      { role: 'system', content: system },
      { role: 'user', content: `Document title: ${docTitle}\n\nDocument content:\n${text}` },
    ]);
  }

  private extractTerms(question: string): string[] {
    const words = question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3);
    return [...new Set(words)].slice(0, 6);
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`AI request timed out after ${ms}ms`)), ms),
      ),
    ]);
  }
}

function hashString(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return h;
}
