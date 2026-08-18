'use client'

import { useState } from 'react'
import { BookOpen, Copy, Check, Code2, Smartphone, Download } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { getApiUrl } from '@/lib/api'
import { useToast } from '@/components/toast'

const WIDGET_JS_URL = process.env.NEXT_PUBLIC_WIDGET_URL || 'https://pdf.djaouad.tech/widget.js'

export function GuideView() {
  const { workspace } = useAuth()
  const { addToast } = useToast()
  const [copied, setCopied] = useState(false)
  const apiUrl = getApiUrl()

  const companyId = workspace?.id || 'YOUR_COMPANY_ID'

  const snippet = `<script src="${WIDGET_JS_URL}" data-company-id="${companyId}"></script>`

  const widgetConfigUrl = `${apiUrl}/widget/${companyId}/config`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      addToast('Could not copy to clipboard', 'error')
    }
  }

  return (
    <div className="max-w-3xl space-y-4 sm:space-y-6">
      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 sm:px-5 sm:py-4">
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <BookOpen className="h-4 w-4 text-primary-text" /> Install the widget
          </h2>
        </div>
        <div className="space-y-4 p-4 text-sm sm:p-5">
          <p className="text-muted-foreground">
            Paste this one line anywhere in your website&apos;s <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">body</code>.
            Visitors will see a floating ask-your-docs assistant that answers from your published documents.
          </p>

          <div className="relative">
            <pre className="overflow-x-auto rounded-xl border border-border bg-secondary p-4 text-xs text-foreground">
              <code>{snippet}</code>
            </pre>
            <button
              onClick={copy}
              className="absolute right-2 top-2 flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="flex items-center gap-2 font-semibold text-foreground">
              <Code2 className="h-4 w-4 text-primary-text" /> Requirements
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">
              <li>At least one document must be <span className="text-foreground">published</span> (see the Documents tab).</li>
              <li>The widget reads config from <code className="rounded bg-secondary px-1 py-0.5">{widgetConfigUrl}</code></li>
              <li>Answers are grounded only in your published documents.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold text-foreground">How the widget works</h2>
        </div>
        <div className="space-y-3 p-5 text-sm text-muted-foreground">
          <p>1. The snippet loads <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">{WIDGET_JS_URL}</code>, a small dependency-free script.</p>
          <p>2. It fetches the widget config and the list of published documents from the backend.</p>
          <p>3. When a visitor asks something, the script calls <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">POST /widget/ask</code> and renders the answer with sources.</p>
          <p>4. Styling (title, color, position) comes from your Settings tab.</p>
        </div>
      </div>

      {/* Mobile App Download */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Smartphone className="h-6 w-6 text-primaryText" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">Get the Mobile App</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload PDFs, ask questions, and manage your workspace from your Android device.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <a
                href="/app-release.apk"
                download
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download APK
              </a>
              <a
                href="https://github.com/djoudad292/smart-pdf-workspace/tree/main/mobile"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                View Source
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
