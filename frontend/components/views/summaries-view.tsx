'use client'

import { useState } from 'react'
import { Sparkles, Loader2, RefreshCw, FileText, Check } from 'lucide-react'
import type { DocumentItem } from '@/app/dashboard/page'
import { apiFetch, formatDate } from '@/lib/api'
import { useToast } from '@/components/toast'

interface Props {
  documents: DocumentItem[]
  onRefresh: () => Promise<void>
}

export function SummariesView({ documents, onRefresh }: Props) {
  const ready = documents.filter((d) => d.status === 'ready')
  const [selectedId, setSelectedId] = useState<string>('')
  const [summary, setSummary] = useState<string>('')
  const [cached, setCached] = useState(false)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const { addToast } = useToast()

  const select = (id: string) => {
    setSelectedId(id)
    setSummary('')
    setCached(false)
    const doc = documents.find((d) => d.id === id)
    if (doc?.summary) {
      setSummary(doc.summary)
      setCached(true)
    }
  }

  const generate = async (force = false) => {
    if (!selectedId) return
    setLoading(true)
    setGenerating(true)
    try {
      const res = await apiFetch<{ summary: string; cached: boolean }>(`/documents/${selectedId}/summarize`, {
        method: 'POST',
        body: JSON.stringify({ force }),
      })
      setSummary(res.summary)
      setCached(res.cached)
      addToast(res.cached ? 'Loaded cached summary' : 'Summary generated', 'success')
      await onRefresh()
    } catch (err: any) {
      addToast(err.message || 'Failed to summarize', 'error')
    } finally {
      setLoading(false)
      setGenerating(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <div className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> Summaries
            </h2>
          </div>
          <div className="p-5">
            <label className="block text-sm font-medium text-foreground mb-2">Document</label>
            <ul className="space-y-2">
              {ready.map((doc) => (
                <li key={doc.id}>
                  <button
                    onClick={() => select(doc.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                      selectedId === doc.id
                        ? 'border-primary/50 bg-primary/10 text-foreground'
                        : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate">{doc.title}</span>
                    {doc.summary && <Check className="h-4 w-4 shrink-0 text-green-400" />}
                  </button>
                </li>
              ))}
            </ul>
            {ready.length === 0 && <p className="text-xs text-muted-foreground">No ready documents yet.</p>}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="font-semibold text-foreground">
              {selectedId ? documents.find((d) => d.id === selectedId)?.title : 'Select a document'}
            </h2>
            {selectedId && (
              <div className="flex gap-2">
                <button
                  onClick={() => generate(false)}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Generate
                </button>
                <button
                  onClick={() => generate(true)}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/60 disabled:opacity-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Regenerate
                </button>
              </div>
            )}
          </div>

          <div className="p-5">
            {!selectedId ? (
              <p className="text-center text-sm text-muted-foreground">Pick a ready document to generate its summary.</p>
            ) : loading ? (
              <div className="flex items-center justify-center gap-3 py-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Reading the document and writing a summary…</p>
              </div>
            ) : summary ? (
              <div>
                {cached && (
                  <p className="mb-3 inline-block rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-0.5 text-xs text-yellow-400">
                    Cached summary · {formatDate(documents.find((d) => d.id === selectedId)?.updatedAt)}
                  </p>
                )}
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{summary}</p>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground">No summary yet — click Generate.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
