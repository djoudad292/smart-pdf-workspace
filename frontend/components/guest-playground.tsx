'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  FileText,
  Loader2,
  Paperclip,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react'
import {
  GuestSessionExpiredError,
  askGuest,
  deleteGuestDocument,
  endGuestSession,
  getGuestSession,
  loadGuestDocuments,
  startGuestSession,
  summarizeGuestDocument,
  uploadGuestDocument,
  type GuestDocument,
  type GuestSource,
} from '@/lib/guest'
import { formatBytes } from '@/lib/api'

const SUGGESTIONS = [
  'How many days of annual leave do I get?',
  'What does the warranty cover?',
  'What is the learning budget?',
]

const ACCEPT = 'application/pdf,.pdf'

type Status = 'starting' | 'ready' | 'error'

interface Message {
  role: 'user' | 'assistant'
  text: string
  sources?: GuestSource[]
}

const inputClass =
  'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900'

const quietButton =
  'inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:border-stone-900 hover:text-stone-900 disabled:opacity-50'

/**
 * No-login demo. Creates an isolated sandbox on the backend, seeds two sample
 * documents, and lets a visitor upload a PDF and ask questions against it
 * without registering. The sandbox expires on its own; nothing is shared with
 * other visitors or with real tenants.
 */
export function GuestPlayground() {
  const [status, setStatus] = useState<Status>('starting')
  const [error, setError] = useState<string | null>(null)
  const [documents, setDocuments] = useState<GuestDocument[]>([])
  const [uploadsLeft, setUploadsLeft] = useState<number>(0)
  const [maxFileMb, setMaxFileMb] = useState(5)
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [question, setQuestion] = useState('')
  const [thinking, setThinking] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [busyDocId, setBusyDocId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  const applyDocuments = useCallback((data: { documents: GuestDocument[]; uploadsLeft: number }) => {
    setDocuments(data.documents)
    setUploadsLeft(data.uploadsLeft)
  }, [])

  /** Runs a guest call, transparently restarting the sandbox if it expired. */
  const withSession = useCallback(
    async <T,>(call: () => Promise<T>): Promise<T> => {
      try {
        return await call()
      } catch (err) {
        if (err instanceof GuestSessionExpiredError) {
          await startGuestSession()
          return call()
        }
        throw err
      }
    },
    [],
  )

  const refresh = useCallback(async () => {
    const data = await withSession(loadGuestDocuments)
    applyDocuments(data)
  }, [applyDocuments, withSession])

  const openSession = useCallback(async () => {
    setStatus('starting')
    setError(null)
    try {
      const stored = getGuestSession()
      const session = stored ?? (await startGuestSession())
      setMaxFileMb(Math.round(session.limits.maxFileBytes / (1024 * 1024)))
      setMinutesLeft(Math.max(0, Math.round((new Date(session.expiresAt).getTime() - Date.now()) / 60000)))
      applyDocuments(await withSession(loadGuestDocuments))
      setStatus('ready')
    } catch (err: any) {
      setError(err?.message || 'Could not start a guest session')
      setStatus('error')
    }
  }, [applyDocuments, withSession])

  useEffect(() => {
    // Guard against StrictMode's double mount so one visitor gets one sandbox.
    if (started.current) return
    started.current = true
    openSession().catch(() => setStatus('error'))
  }, [openSession])

  useEffect(() => {
    if (status !== 'ready') return
    const timer = setInterval(() => {
      const session = getGuestSession()
      setMinutesLeft(
        session
          ? Math.max(0, Math.round((new Date(session.expiresAt).getTime() - Date.now()) / 60000))
          : 0,
      )
    }, 30000)
    return () => clearInterval(timer)
  }, [status])

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  const newSession = async () => {
    await endGuestSession()
    setMessages([])
    setAnnouncement('New sandbox created')
    await openSession()
  }

  const upload = async (file: File) => {
    if (file.size > maxFileMb * 1024 * 1024) {
      setAnnouncement(`That file is larger than ${maxFileMb}MB`)
      return
    }
    setUploading(true)
    setAnnouncement(`Uploading ${file.name}`)
    try {
      const doc = await withSession(() => uploadGuestDocument(file))
      setAnnouncement(
        doc.status === 'failed'
          ? `${doc.title} uploaded, but no text could be extracted from it`
          : `${doc.title} is ready`,
      )
      await refresh()
    } catch (err: any) {
      setAnnouncement(err?.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const remove = async (doc: GuestDocument) => {
    setBusyDocId(doc.id)
    try {
      await withSession(() => deleteGuestDocument(doc.id))
      setAnnouncement(`${doc.title} deleted`)
      await refresh()
    } catch (err: any) {
      setAnnouncement(err?.message || 'Could not delete that document')
    } finally {
      setBusyDocId(null)
    }
  }

  const summarize = async (doc: GuestDocument) => {
    setBusyDocId(doc.id)
    setAnnouncement(`Summarizing ${doc.title}`)
    try {
      const data = await withSession(() => summarizeGuestDocument(doc.id))
      setMessages((prev) => [...prev, { role: 'assistant', text: data.summary }])
      await refresh()
      setAnnouncement(`${doc.title} summarized`)
    } catch (err: any) {
      setAnnouncement(err?.message || 'Could not summarize that document')
    } finally {
      setBusyDocId(null)
    }
  }

  const ask = async (raw?: string) => {
    const text = (raw ?? question).trim()
    if (!text || thinking) return
    setMessages((prev) => [...prev, { role: 'user', text }])
    setQuestion('')
    setThinking(true)
    try {
      const result = await withSession(() => askGuest(text))
      setMessages((prev) => [...prev, { role: 'assistant', text: result.answer, sources: result.sources }])
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: err?.message || 'Something went wrong. Try again.' },
      ])
    } finally {
      setThinking(false)
    }
  }

  if (status === 'starting') {
    return (
      <div className="rounded-lg border border-stone-300 bg-white p-8 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-stone-400" />
        <p className="mt-3 text-sm text-stone-600">Setting up a private sandbox for you…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="rounded-lg border border-stone-300 bg-white p-8 text-center">
        <p className="text-sm text-stone-700">{error}</p>
        <button onClick={openSession} className={`mt-4 ${quietButton}`}>
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </button>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-stone-300 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-900">Your sandbox</p>
          <p className="text-xs text-stone-500">
            Nothing to sign up for. Private to you
            {minutesLeft !== null ? ` · cleared in ${minutesLeft} min` : ''}.
          </p>
        </div>
        <button onClick={newSession} className={quietButton}>
          <RefreshCw className="h-3.5 w-3.5" /> New sandbox
        </button>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col border-stone-200 lg:border-r">
          <div
            ref={chatRef}
            className="flex h-80 flex-col gap-3 overflow-y-auto px-4 py-4"
            aria-live="polite"
          >
            {messages.length === 0 && (
              <div className="text-sm text-stone-600">
                <p className="font-medium text-stone-900">Two sample documents are loaded.</p>
                <p className="mt-1">
                  Ask a question and the answer is pulled from the passages below it. Nothing is
                  invented when a document does not cover something.
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i}>
                <div
                  className={
                    m.role === 'user'
                      ? 'ml-auto max-w-[85%] rounded-md bg-stone-900 px-3 py-2 text-sm leading-relaxed text-white'
                      : 'max-w-[92%] rounded-md bg-stone-100 px-3 py-2 text-sm leading-relaxed text-stone-800'
                  }
                >
                  {m.text}
                </div>
                {m.sources && m.sources.length > 0 && (
                  <details className="mt-2 ml-0 text-xs text-stone-500">
                    <summary className="cursor-pointer select-none">
                      {m.sources.length} source{m.sources.length === 1 ? '' : 's'}
                    </summary>
                    <ul className="mt-2 space-y-2">
                      {m.sources.map((s, j) => (
                        <li key={j} className="rounded-md border border-stone-200 bg-stone-50 p-2.5">
                          <p className="font-medium text-stone-700">
                            {s.documentTitle} · match {Math.round((s.similarity || 0) * 100)}%
                          </p>
                          <p className="mt-1 line-clamp-2 text-stone-600">{s.chunkText}</p>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ))}

            {thinking && (
              <p className="flex items-center gap-2 text-sm text-stone-500">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
                Reading the documents…
              </p>
            )}
          </div>

          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2 border-t border-stone-200 px-4 py-3">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-700 transition-colors hover:border-stone-900 hover:text-stone-900"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            className="flex items-center gap-2 border-t border-stone-200 px-4 py-3"
            onSubmit={(e) => {
              e.preventDefault()
              ask()
            }}
          >
            <label htmlFor="guest-question" className="sr-only">
              Ask a question about the documents in this sandbox
            </label>
            <input
              id="guest-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about these documents…"
              className={inputClass}
              maxLength={1000}
            />
            <button
              type="submit"
              disabled={thinking || !question.trim()}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-stone-900 text-white transition-colors hover:bg-stone-700 disabled:opacity-40"
              aria-label="Send question"
            >
              {thinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>

        <aside className="bg-stone-50 px-4 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Documents
          </h3>
          <ul className="mt-3 space-y-2">
            {documents.map((doc) => (
              <li key={doc.id} className="rounded-md border border-stone-200 bg-white p-2.5">
                <p className="flex items-start gap-2 text-sm font-medium text-stone-900">
                  <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
                  <span className="min-w-0 break-words">{doc.title}</span>
                </p>
                <p className="mt-1 pl-6 text-xs text-stone-500">
                  {doc.isSample ? 'sample' : formatBytes(doc.sizeBytes)} ·{' '}
                  {doc.status === 'ready' ? 'ready' : doc.status}
                </p>
                {!doc.isSample && (
                  <div className="mt-2 flex gap-1.5 pl-1">
                    <button
                      onClick={() => summarize(doc)}
                      disabled={busyDocId === doc.id || doc.status !== 'ready'}
                      className={quietButton}
                    >
                      {busyDocId === doc.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      Summarize
                    </button>
                    <button
                      onClick={() => remove(doc)}
                      disabled={busyDocId === doc.id}
                      className={quietButton}
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-stone-200 pt-4">
            <p className="text-xs text-stone-500">
              Uploads left: {uploadsLeft} · PDF up to {maxFileMb}MB
            </p>
            <button
              onClick={() => fileInput.current?.click()}
              disabled={uploading || uploadsLeft <= 0}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-40"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Paperclip className="h-3.5 w-3.5" />
              )}
              {uploading ? 'Uploading…' : 'Upload your PDF'}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) upload(file)
              }}
            />
            <p className="mt-3 flex items-start gap-1.5 text-xs text-stone-500">
              <BookOpen className="mt-0.5 h-3 w-3 shrink-0" />
              Uploads live only in this sandbox and are deleted when it expires.
            </p>
          </div>
        </aside>
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  )
}
