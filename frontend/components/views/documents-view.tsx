'use client'

import { useRef, useState } from 'react'
import { FileText, Upload, Loader2, Download, Trash2, RefreshCw, Globe } from 'lucide-react'
import type { DocumentItem } from '@/app/dashboard/page'
import { apiFetch, apiUpload, formatBytes, formatDate } from '@/lib/api'
import { useToast } from '@/components/toast'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface Props {
  documents: DocumentItem[]
  loading: boolean
  onRefresh: () => Promise<void>
}

const STATUS_STYLES: Record<string, string> = {
  ready: 'bg-success/15 text-success border-green-500/30',
  processing: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  failed: 'bg-danger/15 text-danger border-red-500/30',
}

export function DocumentsView({ documents, loading, onRefresh }: Props) {
  const [uploading, setUploading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<DocumentItem | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const { addToast } = useToast()

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const data = await apiUpload('/documents/upload', form)
      addToast(data.status === 'failed' ? 'Uploaded but text extraction failed' : 'Uploaded successfully', data.status === 'failed' ? 'error' : 'success')
      await onRefresh()
    } catch (err: any) {
      addToast(err.message || 'Upload failed', 'error')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const togglePublish = async (doc: DocumentItem) => {
    setBusyId(doc.id)
    try {
      await apiFetch(`/documents/${doc.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ published: !doc.published }),
      })
      addToast(doc.published ? 'Unpublished document' : 'Document published to widget', 'success')
      await onRefresh()
    } catch (err: any) {
      addToast(err.message || 'Failed to update document', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const reindex = async (doc: DocumentItem) => {
    setBusyId(doc.id)
    try {
      await apiFetch(`/documents/${doc.id}/reindex`, { method: 'POST' })
      addToast('Reindexing started', 'info')
      await onRefresh()
    } catch (err: any) {
      addToast(err.message || 'Reindex failed', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (doc: DocumentItem) => {
    setConfirmDelete(null)
    setBusyId(doc.id)
    try {
      await apiFetch(`/documents/${doc.id}`, { method: 'DELETE' })
      addToast('Document deleted', 'success')
      await onRefresh()
    } catch (err: any) {
      addToast(err.message || 'Failed to delete document', 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5 text-center sm:p-8">
        <Upload className="mx-auto mb-3 h-8 w-8 text-primary-text" />
        <h2 className="font-semibold text-foreground">Upload a PDF</h2>
        <p className="mt-1 text-sm text-muted-foreground">PDFs up to 10MB. Text is extracted, chunked, and embedded automatically.</p>
        <button
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? 'Uploading…' : 'Choose PDF'}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold text-foreground">Your documents</h2>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-secondary" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">No documents yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {documents.map((doc) => (
              <li key={doc.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(doc.sizeBytes)} · {doc.pageCount} pages · {formatDate(doc.createdAt)}
                  </p>
                  {doc.error && <p className="mt-1 text-xs text-danger">{doc.error}</p>}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs capitalize ${STATUS_STYLES[doc.status] || 'bg-secondary text-muted-foreground'}`}
                  >
                    {doc.status}
                  </span>

                  {doc.status === 'ready' && (
                    <button
                      onClick={() => togglePublish(doc)}
                      disabled={busyId === doc.id}
                      className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                        doc.published
                          ? 'border-green-500/40 bg-success/10 text-success'
                          : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Globe className="h-3 w-3" />
                      {doc.published ? 'Published' : 'Publish'}
                    </button>
                  )}

                  {doc.status === 'failed' && (
                    <button
                      onClick={() => reindex(doc)}
                      disabled={busyId === doc.id}
                      className="flex items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary/60 disabled:opacity-50"
                    >
                      {busyId === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      Reindex
                    </button>
                  )}

                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL}/documents/${doc.id}/download`}
                    className="flex items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary/60"
                  >
                    <Download className="h-3 w-3" /> Download
                  </a>

                  <button
                    onClick={() => setConfirmDelete(doc)}
                    disabled={busyId === doc.id}
                    className="flex items-center gap-1 rounded-lg border border-red-500/40 bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger/20 disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete document?"
        message={confirmDelete ? `"${confirmDelete.title}" will be permanently deleted. This cannot be undone.` : ''}
        onConfirm={() => confirmDelete && remove(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
