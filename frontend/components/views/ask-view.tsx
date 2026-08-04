'use client'

import { useState } from 'react'
import { MessageSquare, Send, Loader2, FileText, Search, BookOpen } from 'lucide-react'
import type { DocumentItem } from '@/app/dashboard/page'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/components/toast'

interface Props {
  documents: DocumentItem[]
}

interface Source {
  id: string
  chunkText: string
  similarity: number
}

interface AskResult {
  answer: string
  sources: Source[]
}

export function AskView({ documents }: Props) {
  const ready = documents.filter((d) => d.status === 'ready')
  const [selectedId, setSelectedId] = useState<string>('')
  const [question, setQuestion] = useState('')
  const [history, setHistory] = useState<{ question: string; result: AskResult }[]>([])
  const [loading, setLoading] = useState(false)

  const { addToast } = useToast()

  const ask = async () => {
    if (!selectedId) {
      addToast('Select a document first', 'info')
      return
    }
    if (!question.trim()) return
    setLoading(true)
    try {
      const result = await apiFetch<AskResult>(`/documents/${selectedId}/ask`, {
        method: 'POST',
        body: JSON.stringify({ question: question.trim() }),
      })
      setHistory((prev) => [{ question: question.trim(), result }, ...prev])
      setQuestion('')
    } catch (err: any) {
      addToast(err.message || 'Failed to get an answer', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold text-foreground">
              <Search className="h-4 w-4 text-primary" /> Ask a document
            </h2>
          </div>

          <div className="space-y-5 p-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Document</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a ready document…</option>
                {ready.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title}
                  </option>
                ))}
              </select>
              {ready.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  No ready documents. Upload a PDF first and wait for it to finish processing.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Question</label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    ask()
                  }
                }}
                rows={3}
                placeholder="e.g. What are the refund policies described in this document?"
                className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              onClick={ask}
              disabled={loading || !question.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {loading ? 'Searching the document…' : 'Ask'}
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {history.length === 0 && !loading && (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Ask a question and the answer, with sources, will appear here.
            </p>
          )}

          {loading && (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Retrieving relevant passages and generating an answer…</p>
            </div>
          )}

          {history.map((item, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card">
              <div className="border-b border-border px-5 py-3 text-sm font-medium text-foreground">Q: {item.question}</div>
              <div className="p-5">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{item.result.answer}</p>
                {item.result.sources.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <BookOpen className="h-3.5 w-3.5" /> Sources
                    </p>
                    <ul className="space-y-2">
                      {item.result.sources.map((s, j) => (
                        <li key={s.id} className="rounded-lg border border-border bg-secondary p-3">
                          <p className="mb-1 text-[10px] text-muted-foreground">Match {(s.similarity * 100).toFixed(0)}%</p>
                          <p className="line-clamp-2 text-xs text-foreground/80">{s.chunkText}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hidden lg:block">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">How it works</h3>
          <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Your PDF is chunked and embedded when uploaded.</li>
            <li className="flex gap-2"><Search className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Your question is embedded and matched to the most relevant passages.</li>
            <li className="flex gap-2"><BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> The LLM answers strictly from those passages, with sources shown.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
