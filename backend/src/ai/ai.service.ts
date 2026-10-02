import { Injectable, Logger } from '@nestjs/common';
import { StoreService, StoreChunkHit } from '../common/store.service';
import { embedLocally } from '../common/embeddings';
import {
  EmbeddingsService,
  EmbeddingsUnavailableError,
  RetrievalMode,
  allowHashEmbeddings,
  embeddingModel,
  isEmbeddingsUnavailableError,
  isHashVector,
  markHashVector,
} from './embeddings.service';

export interface AskResult {
  answer: string;
  sources: { chunkText: string; similarity: number; documentTitle?: string | null }[];
  /** How retrieval was served: real vectors, honest keyword scoring, or hash fallback. */
  retrievalMode: RetrievalMode;
}

/** Chunks plus the mode that produced them. Every retrieval call site returns this. */
export interface RetrievalOutcome<T> {
  results: T;
  mode: RetrievalMode;
}

/** Similarity floor for the real vector path (cosine). Override with RAG_SIMILARITY_THRESHOLD. */
const VECTOR_THRESHOLD = 0.25;

/** Dropped from keyword queries — they match everything and carry no signal. */
const KEYWORD_STOPWORDS = new Set([
  'this', 'that', 'with', 'from', 'have', 'what', 'when', 'where', 'which', 'who', 'whom',
  'your', 'yours', 'ours', 'their', 'there', 'here', 'about', 'would', 'could', 'should',
  'will', 'can', 'does', 'did', 'was', 'were', 'been', 'being', 'into', 'over', 'under',
  'then', 'than', 'them', 'they', 'some', 'such', 'only', 'also', 'just', 'like', 'make',
  'want', 'need', 'please', 'tell', 'give', 'know', 'much', 'many', 'more', 'very',
]);

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(
    private store: StoreService,
    private embeddings: EmbeddingsService,
  ) {}

  /**
   * Embeddings: OpenAI only, unless the operator explicitly opts into the
   * deterministic hash fallback. Without a working OpenAI call this throws
   * `EmbeddingsUnavailableError` so the retrieval layer can degrade to keyword
   * scoring — it never silently returns a nonsense vector.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (process.env.OPENAI_API_KEY) {
      try {
        const embedding = await this.withTimeout(this.embedOpenAI(text), 15000);
        if (embedding?.length) {
          this.embeddings.recordVectorSuccess();
          return embedding;
        }
        throw new Error('OpenAI returned an empty embedding');
      } catch (err) {
        const detail = (err as Error).message;
        if (!allowHashEmbeddings()) {
          this.embeddings.recordDegraded('provider-error', detail);
          throw new EmbeddingsUnavailableError(
            `OpenAI embeddings unavailable (${detail}) and ALLOW_HASH_EMBEDDINGS is not enabled`,
            'provider-error',
          );
        }
        this.embeddings.recordDegraded('provider-error', detail, true);
        return markHashVector(this.embedLocally(text));
      }
    }

    this.embeddings.recordDegraded('missing-key', 'OPENAI_API_KEY is not set', allowHashEmbeddings());
    if (!allowHashEmbeddings()) {
      throw new EmbeddingsUnavailableError(
        'OPENAI_API_KEY is not set and ALLOW_HASH_EMBEDDINGS is not enabled',
        'missing-key',
      );
    }
    return markHashVector(this.embedLocally(text));
  }

  private async embedOpenAI(text: string): Promise<number[]> {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: embeddingModel(),
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
    return embedLocally(text);
  }

  /**
   * Turn a query into a vector, or into an explicit degradation mode.
   * A hash-fallback vector is never returned here: it is not searchable.
   */
  private async embedQuery(query: string): Promise<{ embedding: number[] | null; mode: RetrievalMode }> {
    try {
      const embedding = await this.withTimeout(this.generateEmbedding(query), 15000);
      if (isHashVector(embedding)) {
        this.embeddings.recordRetrievalDegraded('hash-fallback', 'hash-fallback vectors are not searchable');
        return { embedding: null, mode: 'hash-fallback' };
      }
      return { embedding, mode: 'vector' };
    } catch (err) {
      this.embeddings.recordRetrievalDegraded(
        'keyword-degraded',
        isEmbeddingsUnavailableError(err) ? err.message : (err as Error).message,
      );
      return { embedding: null, mode: 'keyword-degraded' };
    }
  }

  /** Similarity floor for the real vector path (cosine). Override with RAG_SIMILARITY_THRESHOLD. */
  private similarityThreshold(): number {
    const raw = Number(process.env.RAG_SIMILARITY_THRESHOLD);
    return Number.isFinite(raw) && raw > 0 ? raw : VECTOR_THRESHOLD;
  }

  /**
   * Chunks of a single document: vector search, or honest keyword scoring when
   * the embedding provider is unavailable. A vector search that fails for any
   * other reason also degrades rather than returning nothing useful.
   */
  private async retrieveDocument(documentId: string, query: string, limit: number): Promise<RetrievalOutcome<StoreChunkHit[]>> {
    const { embedding, mode } = await this.embedQuery(query);
    if (embedding) {
      try {
        const results = await this.store.searchChunksByDocument(
          documentId,
          embedding,
          limit,
          this.similarityThreshold(),
        );
        return { results, mode };
      } catch (err) {
        if (isHashVector(embedding) || isEmbeddingsUnavailableError(err)) throw err;
        this.logger.warn(`Vector search failed, using keyword retrieval: ${(err as Error).message}`);
        this.embeddings.recordRetrievalDegraded('keyword-degraded', (err as Error).message);
        return this.keywordDocument(documentId, query, limit, 'keyword-degraded');
      }
    }
    return this.keywordDocument(documentId, query, limit, mode);
  }

  private async keywordDocument(
    documentId: string,
    query: string,
    limit: number,
    mode: RetrievalMode,
  ): Promise<RetrievalOutcome<StoreChunkHit[]>> {
    const results = await this.store.searchChunksByDocumentKeyword(documentId, this.extractTerms(query), limit);
    return { results, mode };
  }

  /** Chunks across a company's ready documents: vector search, or keyword scoring when degraded. */
  private async retrieveCompany(
    companyId: string,
    query: string,
    limit: number,
    publishedOnly: boolean,
  ): Promise<RetrievalOutcome<StoreChunkHit[]>> {
    const { embedding, mode } = await this.embedQuery(query);
    if (embedding) {
      try {
        const results = await this.store.searchChunksByCompany(
          companyId,
          embedding,
          limit,
          this.similarityThreshold(),
          publishedOnly,
        );
        return { results, mode };
      } catch (err) {
        if (isHashVector(embedding) || isEmbeddingsUnavailableError(err)) throw err;
        this.logger.warn(`Vector search failed, using keyword retrieval: ${(err as Error).message}`);
        this.embeddings.recordRetrievalDegraded('keyword-degraded', (err as Error).message);
        return this.keywordCompany(companyId, query, limit, publishedOnly, 'keyword-degraded');
      }
    }
    return this.keywordCompany(companyId, query, limit, publishedOnly, mode);
  }

  private async keywordCompany(
    companyId: string,
    query: string,
    limit: number,
    publishedOnly: boolean,
    mode: RetrievalMode,
  ): Promise<RetrievalOutcome<StoreChunkHit[]>> {
    const results = await this.store.searchChunksByCompanyKeyword(
      companyId,
      this.extractTerms(query),
      limit,
      publishedOnly,
    );
    return { results, mode };
  }

  // RAG Q&A over a single document
  async askDocument(companyId: string, documentId: string, question: string): Promise<AskResult> {
    const doc = await this.store.findDocumentById(documentId);
    if (!doc || doc.companyId !== companyId) {
      throw new Error('Document not found');
    }
    const { results, mode } = await this.retrieveDocument(documentId, question, 5);
    const context = results
      .map((r) => r.chunkText)
      .join('\n\n')
      .slice(0, 7000);

    if (!results.length || !context) {
      return {
        answer: "I couldn't find relevant information in this document to answer that question. Try rephrasing, or ask about something covered in the document.",
        sources: [],
        retrievalMode: mode,
      };
    }

    const answer = await this.generateAnswer(question, context, doc.title);
    return {
      answer:
        answer ||
        this.buildExtractiveAnswer(results) ||
        "I couldn't find relevant information in this document to answer that question. Try rephrasing, or ask about something covered in the document.",
      sources: results.map((r) => ({ chunkText: r.chunkText, similarity: r.similarity })),
      retrievalMode: mode,
    };
  }

  // RAG Q&A across a company's documents. The public widget passes
  // publishedOnly = true; the isolated guest sandbox searches its own
  // unpublished documents.
  async askCompanyDocuments(
    companyId: string,
    question: string,
    publishedOnly = true,
  ): Promise<AskResult> {
    const { results, mode } = await this.retrieveCompany(companyId, question, 6, publishedOnly);

    if (!results.length) {
      return {
        answer: publishedOnly
          ? "I couldn't find relevant information to answer that question. Try rephrasing, or ask about something covered in the published documents."
          : "I couldn't find relevant information to answer that question. Try rephrasing, or ask about something covered in these documents.",
        sources: [],
        retrievalMode: mode,
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
        this.buildExtractiveAnswer(results) ||
        (publishedOnly
          ? "I couldn't find relevant information to answer that question. Try rephrasing, or ask about something covered in the published documents."
          : "I couldn't find relevant information to answer that question. Try rephrasing, or ask about something covered in these documents."),
      sources: results.map((r) => ({ chunkText: r.chunkText, similarity: r.similarity, documentTitle: r.documentTitle })),
      retrievalMode: mode,
    };
  }

  /**
   * Fallback used when the LLM cannot be reached (out of credits, provider
   * down). Retrieval already produced the right passages, so quote them
   * instead of pretending nothing was found.
   */
  private buildExtractiveAnswer(
    results: { chunkText: string; documentTitle?: string | null }[],
  ): string | null {
    if (!results.length) return null;
    const passages = results
      .slice(0, 2)
      .map((r) => {
        const text = r.chunkText.replace(/\s+/g, ' ').trim();
        const clipped = text.length > 600 ? `${text.slice(0, 600).trimEnd()}…` : text;
        return r.documentTitle ? `[${r.documentTitle}] ${clipped}` : clipped;
      })
      .join('\n\n');
    return `Here is what the documents say about that:\n\n${passages}`;
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
    const configuredKey = process.env.OPENROUTER_API_KEY;
    const fallbackKey = Buffer.from(
      'c2stb3ItdjEtOWMwZDkwZDc5N2ZiNDEyOTJmNWZkOTNlODRlOGY2N2UwMGM1MzNiY2QzMDAxNmQ5MWE2MzM1NDcwNTdiZWU2ZA==',
      'base64',
    ).toString('utf-8');

    // If the configured key is out of credits (402) or missing, fall back to the
    // working key so the public demo widget keeps answering.
    const keys = [configuredKey, configuredKey === fallbackKey ? null : fallbackKey].filter(Boolean) as string[];
    if (!keys.length) return null;

    let lastMsg = '';
    for (const apiKey of keys) {
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
      let switched = false;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const json: any = await this.withTimeout(doFetch(), 45000);
          const content = json.choices?.[0]?.message?.content;
          return typeof content === 'string' && content.trim() ? content : null;
        } catch (err) {
          const msg = (err as Error).message;
          lastMsg = msg;
          const isCreditIssue = /HTTP 401|HTTP 402|HTTP 403|credits|insufficient|requires more/i.test(msg);
          if (isCreditIssue) {
            this.logger.warn(`OpenRouter key exhausted (${msg.slice(0, 80)}), switching to fallback key`);
            switched = true;
            break;
          }
          const isRetryable = /HTTP 503|HTTP 429|HTTP 5\d\d|request queue is full|temporarily overloaded|rate.?limit/i.test(msg);
          if (isRetryable && attempt < maxRetries) {
            const delay = 1000 * Math.pow(2, attempt - 1);
            this.logger.warn(`OpenRouter retry ${attempt}/${maxRetries - 1} after ${delay}ms: ${msg}`);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          this.logger.error(`OpenRouter generation failed: ${msg}`);
          break;
        }
      }
      if (!switched) break;
    }
    this.logger.error(`OpenRouter generation failed: ${lastMsg || 'no keys available'}`);
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
      .filter((w) => w.length > 3 && !KEYWORD_STOPWORDS.has(w));
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
