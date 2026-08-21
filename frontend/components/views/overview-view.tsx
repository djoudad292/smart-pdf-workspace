'use client'

import { FileText, Files, MessageSquare, Sparkles, Upload, ArrowUpRight } from 'lucide-react'
import type { DocumentItem } from '@/app/dashboard/page'
import { formatBytes, formatDate } from '@/lib/api'
import type { TabKey } from '@/components/sidebar'

interface Props {
  documents: DocumentItem[]
  loading: boolean
  onNavigate: (tab: TabKey) => void
}

const STATUS_STYLES: Record<string, string> = {
  ready: 'bg-success/15 text-success border-green-500/30',
  processing: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  failed: 'bg-danger/15 text-danger border-red-500/30',
}

export function OverviewView({ documents, loading, onNavigate }: Props) {
  const ready = documents.filter((d) => d.status === 'ready')
  const published = documents.filter((d) => d.published)
  const totalPages = documents.reduce((sum, d) => sum + (d.pageCount || 0), 0)

  const stats = [
    { label: 'Documents', value: documents.length, icon: Files, tab: 'documents' as TabKey },
    { label: 'Ready to answer', value: ready.length, icon: MessageSquare, tab: 'ask' as TabKey },
    { label: 'Published', value: published.length, icon: Upload, tab: 'guide' as TabKey },
    { label: 'Total pages', value: totalPages, icon: FileText, tab: 'documents' as TabKey },
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <button
              key={stat.label}
              onClick={() => onNavigate(stat.tab)}
              className="rounded-2xl border border-border bg-card p-3.5 text-left transition-colors hover:border-primary/50 sm:p-5"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                <Icon className="h-5 w-5 text-primary-text" />
              </div>
              <p className="text-2xl font-bold text-foreground">{loading ? '…' : stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </button>
          )
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-semibold text-foreground">Recent documents</h2>
          <button
            onClick={() => onNavigate('documents')}
            className="flex items-center gap-1 text-sm font-medium text-primary-text hover:text-primary-text/80"
          >
            View all <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-secondary" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No documents yet. Upload your first PDF to get started.</p>
            <button
              onClick={() => onNavigate('documents')}
              className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Upload a PDF
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {documents.slice(0, 5).map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(doc.sizeBytes)} · {doc.pageCount} pages · {formatDate(doc.createdAt)}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs capitalize ${STATUS_STYLES[doc.status] || 'bg-secondary text-muted-foreground'}`}
                >
                  {doc.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary-text" />
        <div className="text-sm">
          <p className="font-semibold text-foreground">Publish a document to power the ask-your-docs widget</p>
          <p className="mt-1 text-muted-foreground">
            Once a document finishes processing, toggle it to published in the Documents tab. The widget on your website
            will then answer questions from those documents automatically.
          </p>
        </div>
      </div>
    </div>
  )
}
