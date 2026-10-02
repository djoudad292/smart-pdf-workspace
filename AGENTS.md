# Smart PDF Workspace — Agent Guide

Monorepo with four parts: **backend** (NestJS), **frontend** (Next.js 14), **mobile** (Expo), **widget** (vanilla JS).

## Commands

```bash
# Backend (NestJS 10)
cd backend && npm install && npm run build && npm test

# Prove the degraded paths against a real app + DB (needs backend/.env, hits the configured DB)
cd backend && npm run build && node scripts/prove-degraded-path.cjs   # keyword-degraded retrieval + /health/embeddings
cd backend && node scripts/prove-ingest-gate.cjs                      # scanned-PDF rejection + density warning

# Frontend (Next.js 14, static export)
cd frontend && npm install && npm run build

# Widget (esbuild) — output lands in frontend/public/widget.js
cd widget && npm install && npm run build

# Mobile (Expo SDK 54)
cd mobile && npm install && npx tsc --noEmit && npm start
```

## Backend

- NestJS 10 + `pg` + pgvector. Port 3001. CORS `*`.
- Multi-tenant auth: JWT access (15m) + refresh (7d) with `token_version` revocation, bcrypt, company slug, forgot/reset password.

### PDF scope — read this before claiming any support

- `pdf-parse` reads the **text layer only**. There is **no OCR, no table extraction and no layout analysis**, so do not market scanned-document or table support.
- After extraction, `analyzeExtraction` (`src/documents/pdf-quality.ts`) runs **before any chunking or embedding**, so a rejected upload never burns embedding calls:
  - below `PDF_MIN_CHARS_PER_PAGE` (default 20) characters per page, or empty/whitespace-only text → **rejected**, `status='failed'`, error names OCR as the reason.
  - below `PDF_LOW_DENSITY_CHARS_PER_PAGE` (default 200) characters per page → **indexed** but flagged: `documents.ingest_warning`, returned on the upload result and in the guest document list.
- Reindex runs the same gate, so reindexing a scanned PDF cannot create an empty index.

### Retrieval and the embeddings contract

- Documents: upload PDF → quality gate → **sentence-aware** chunking (~500 chars, breaks only on sentence boundaries, short overlap) → embeddings → `document_chunks` (vector(1536), HNSW index, gracefully skipped on failure → exact search).
- **A hash "embedding" is not an embedding.** It is a djb2 bucket, so cosine similarity over it is noise and retrieval returns confident wrong answers. Therefore:
  - `ALLOW_HASH_EMBEDDINGS` defaults to `"false"`. Without a working OpenAI call, `generateEmbedding` throws `EmbeddingsUnavailableError` instead of returning a hash vector.
  - Hash vectors are tagged in a `WeakSet`; **every** `<=>` search in `StoreService` (`assertSearchableVector`) throws on a tagged vector. This is a hard invariant, not a convention.
  - Retrieval degrades to honest keyword scoring (`retrievalMode: "keyword-degraded"`, marker `RETRIEVAL_DEGRADED`); embeddings degradation logs `EMBEDDINGS_DEGRADED`. Both warn once per process.
  - Keyword `similarity` is the matched-term ratio, not a constant `1`. There is **no threshold relaxation ladder** — it hid the failure, it did not fix it.
  - Chunks are stored with a **null** embedding when embeddings are unavailable (uploads, reindex, guest samples, demo seed), so the product still answers via keyword mode instead of failing.
- Startup log: `embeddings: configured=<bool> mode=<vector|hash-fallback> allowHash=<bool>` (from `EmbeddingsService.onModuleInit`, so it runs on Render/local **and** Vercel serverless — both go through `buildApp()` in `main.ts`).
- Public unauthenticated `GET /health/embeddings` returns `{ mode, model, openaiConfigured, allowHashEmbeddings, lastEmbeddingSuccessAt, lastDegradedAt }`.
- Every retrieval call site returns `{ results, mode }`. `retrievalMode` is in the answer payload of `/documents/:id/ask`, `/widget/ask` and the guest equivalents — **the endpoints that actually retrieve**. `POST /documents/:id/summarize` (and its guest equivalent) returns `{ summary, cached }` and **no** `retrievalMode`: summarization reads the whole document, so no retrieval ran and there is no mode to report. Do not annotate a non-retrieval response with a retrieval mode.

### Other backend notes

- Files stored as `BYTEA` in `documents.file`. Reindex deletes + re-embeds. `published` flag gates the public widget.
- AI: OpenRouter chat (`google/gemini-2.5-flash` default via `OPENROUTER_MODEL`), OpenAI embeddings (`text-embedding-3-small`).
- Endpoints:
  - `POST /auth/register|login|refresh|logout|forgot-password|reset-password`
  - `GET /users`, `POST /agents/invite`, `DELETE /agents/:id`, `GET /companies/profile`, `PATCH /companies/settings`
  - `POST /documents/upload`, `GET /documents`, `GET /documents/:id`, `GET /documents/:id/download`, `DELETE /documents/:id`, `PATCH /documents/:id` (published), `POST /documents/:id/ask`, `POST /documents/:id/summarize`, `POST /documents/:id/reindex`
  - `GET /widget/:companyId/config`, `POST /widget/ask` (public)
  - `GET /health/embeddings` (public, unauthenticated)

## Frontend

- Next.js 14 with `output: 'export'` (static). Deployed on Vercel/Netlify.
- `NEXT_PUBLIC_API_URL` is the backend URL. `NEXT_PUBLIC_WIDGET_URL` points at the built widget.
- `/dashboard` tabs: Overview, Documents, Ask, Summaries, Team, Settings, Guide.

## Widget

- `widget/src/widget.ts` bundles to `frontend/public/widget.js` via esbuild.
- `WIDGET_API_URL` bakes the backend URL in at build time.
- Embed: `<script src=".../widget.js" data-company-id="COMPANY_ID"></script>`

## Mobile

# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

- Expo SDK 54, expo-router 6, expo-secure-store, expo-document-picker (PDF upload).
- `EXPO_PUBLIC_API_URL` in `mobile/.env` points at the backend.
- EAS project: run `eas init` once for this repo, then replace the `REPLACE_WITH_EAS_PROJECT_ID` placeholder in `mobile/app.json`.
- Build APK: `eas build -p android --profile preview`.

## Deploy

- Backend → Vercel serverless (root dir `backend`, `vercel.json` rewrites everything to `/api/index`) or Render (`npm run start:prod`). Entry: `api/index.ts` → `getHandler()` in `src/main.ts`.
  - **Anything that must run at startup must live in `buildApp()` or in a service `onModuleInit`, never in the `if (!process.env.VERCEL)` block** — that block does not execute on Vercel.
- DB → Neon/Supabase Postgres (needs pgvector extension).
- Frontend → Vercel/Netlify: root dir `frontend`.
- Widget → served from frontend static build (`public/widget.js`).
