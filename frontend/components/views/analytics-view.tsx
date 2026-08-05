'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { Loader2, FileText, Files, MessageSquare, Users, Layers, RefreshCcw } from 'lucide-react'

interface Summary {
  documents: number
  readyDocuments: number
  publishedDocuments: number
  processingDocuments: number
  failedDocuments: number
  chunks: number
  teamMembers: number
  totalSizeBytes: number
  totalQuestions: number
  questionsToday: number
}

interface AskDay {
  day: string
  count: number
}

interface RecentAsk {
  question: string
  source: string
  createdAt: string
}

interface Analytics {
  summary: Summary
  asksByDay: AskDay[]
  recentAsks: RecentAsk[]
}

function Sparkline({ points, color = '#6366f1' }: { points: AskDay[]; color?: string }) {
  const values = points.map((p) => p.count)
  const max = Math.max(...values, 1)
  const w = 100
  const h = 44
  const step = values.length > 1 ? w / (values.length - 1) : 0
  const coords = values.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 6) - 3).toFixed(1)}`)
  const polyline = coords.join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{ height: 90 }}>
      <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={polyline} />
      <polyline fill={color} opacity="0.12" points={`0,${h} ${polyline} ${w},${h}`} stroke="none" />
    </svg>
  )
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function AnalyticsView() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    apiFetch<Analytics>('/analytics')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const s = data?.summary
  const readyPercent = s && s.documents > 0 ? Math.round((s.readyDocuments / s.documents) * 100) : 0

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Analytics</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Your knowledge base at a glance. Questions are tracked from the Ask view and your embedded widget.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
        >
          <RefreshCcw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Documents</p>
              <p className="mt-2 text-3xl font-bold text-indigo-400">{s?.documents ?? 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatBytes(s?.totalSizeBytes ?? 0)} indexed</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Ready</p>
              <p className="mt-2 text-3xl font-bold text-emerald-400">{s?.readyDocuments ?? 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s?.chunks ?? 0} chunks embedded</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Questions Asked</p>
              <p className="mt-2 text-3xl font-bold text-violet-400">{s?.totalQuestions ?? 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s?.questionsToday ?? 0} today</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Team</p>
              <p className="mt-2 text-3xl font-bold text-orange-400">{s?.teamMembers ?? 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s?.publishedDocuments ?? 0} published live</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold text-foreground">Questions (last 14 days)</h3>
              <Sparkline points={data?.asksByDay ?? []} color="#6366f1" />
              {data && data.asksByDay.length > 0 && (
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{data.asksByDay[0]?.day}</span>
                  <span>{data.asksByDay[data.asksByDay.length - 1]?.day}</span>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold text-foreground">Document health</h3>
              <div className="mb-4 flex h-8 w-full overflow-hidden rounded-lg bg-secondary">
                <div
                  className="flex items-center justify-center bg-emerald-500 text-xs font-medium text-white transition-all"
                  style={{ width: `${readyPercent}%` }}
                >
                  {readyPercent > 12 && `Ready ${readyPercent}%`}
                </div>
                <div
                  className="flex items-center justify-center bg-blue-500 text-xs font-medium text-white transition-all"
                  style={{ width: `${s && s.documents > 0 ? (s.processingDocuments / s.documents) * 100 : 0}%` }}
                />
                <div
                  className="flex items-center justify-center bg-red-500 text-xs font-medium text-white transition-all"
                  style={{ width: `${s && s.documents > 0 ? (s.failedDocuments / s.documents) * 100 : 0}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-secondary/60 p-3">
                  <p className="text-xl font-bold text-emerald-400">{s?.readyDocuments ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground">Ready</p>
                </div>
                <div className="rounded-lg bg-secondary/60 p-3">
                  <p className="text-xl font-bold text-blue-400">{s?.processingDocuments ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground">Processing</p>
                </div>
                <div className="rounded-lg bg-secondary/60 p-3">
                  <p className="text-xl font-bold text-red-400">{s?.failedDocuments ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground">Failed</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                <MessageSquare className="h-4 w-4 text-primary" /> Recent questions
              </h3>
              {data && data.recentAsks.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No questions yet. Ask something in the Ask view or let your widget visitors chat.
                </p>
              ) : (
                <ul className="space-y-2">
                  {(data?.recentAsks ?? []).map((a, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/60 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">{a.question}</p>
                        <p className="text-[11px] text-muted-foreground">
                          <span className="capitalize">{a.source}</span> · {formatDate(a.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Files className="h-4 w-4 text-primary" /> Status breakdown
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Ready', value: s?.readyDocuments ?? 0, color: 'bg-emerald-500', icon: FileText },
                    { label: 'Processing', value: s?.processingDocuments ?? 0, color: 'bg-blue-500', icon: Files },
                    { label: 'Failed', value: s?.failedDocuments ?? 0, color: 'bg-red-500', icon: Files },
                    { label: 'Published live', value: s?.publishedDocuments ?? 0, color: 'bg-violet-500', icon: Layers },
                  ].map((row) => {
                    const Icon = row.icon
                    const pct = s && s.documents > 0 ? Math.min((row.value / s.documents) * 100, 100) : 0
                    return (
                      <div key={row.label}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Icon className="h-3.5 w-3.5" /> {row.label}
                          </span>
                          <span className="font-medium text-foreground">{row.value}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div className={`h-full rounded-full ${row.color} transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Users className="h-4 w-4 text-primary" /> Team
                </h3>
                <p className="text-3xl font-bold text-foreground">{s?.teamMembers ?? 0}</p>
                <p className="mt-1 text-xs text-muted-foreground">members share this workspace</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
