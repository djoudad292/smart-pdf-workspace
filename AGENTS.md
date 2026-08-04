# Smart PDF Workspace — Agent Guide

Monorepo with four parts: **backend** (NestJS), **frontend** (Next.js 14), **mobile** (Expo), **widget** (vanilla JS).

## Commands

```bash
# Backend (NestJS 10)
cd backend && npm install && npm run build && npm test

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
- Documents: upload PDF → `pdf-parse` text extraction → paragraph-aware chunking (~500 chars) → embeddings → `document_chunks` table (vector(1536), HNSW index, gracefully skipped on failure → exact search).
- Files stored as `BYTEA` in `documents.file`. Reindex deletes + re-embeds. `published` flag gates the public widget.
- AI: OpenRouter chat (`google/gemini-2.5-flash` default via `OPENROUTER_MODEL`), OpenAI embeddings (`text-embedding-3-small`) with local hash fallback (1536-dim).
- Endpoints:
  - `POST /auth/register|login|refresh|logout|forgot-password|reset-password`
  - `GET /users`, `POST /agents/invite`, `DELETE /agents/:id`, `GET /companies/profile`, `PATCH /companies/settings`
  - `POST /documents/upload`, `GET /documents`, `GET /documents/:id`, `GET /documents/:id/download`, `DELETE /documents/:id`, `PATCH /documents/:id` (published), `POST /documents/:id/ask`, `POST /documents/:id/summarize`, `POST /documents/:id/reindex`
  - `GET /widget/:companyId/config`, `POST /widget/ask` (public)

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

- Backend → Render: root dir `backend`, build `npm install && npm run build`, start `npm run start:prod`. Env: see `backend/.env.example`.
- DB → Neon/Supabase Postgres (needs pgvector extension).
- Frontend → Vercel/Netlify: root dir `frontend`.
- Widget → served from frontend static build (`public/widget.js`).
