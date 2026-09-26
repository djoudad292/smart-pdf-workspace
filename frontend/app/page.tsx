'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Copy, Download } from 'lucide-react'

const APK_URL =
  'https://github.com/djoudad292/smart-pdf-workspace/releases/download/latest-apk-pdf/smart-pdf.apk'
const PORTFOLIO_URL = 'https://djaouad.is-a.dev'
const WIDGET_SNIPPET = `<script src="${process.env.NEXT_PUBLIC_WIDGET_URL || 'https://docs.djaouad.is-a.dev/widget.js'}" data-company-id="YOUR_COMPANY_ID"></script>`

const STEPS = [
  {
    title: 'Upload a PDF',
    body: 'Drop in a file. The text is extracted, split into passages and turned into embeddings.',
  },
  {
    title: 'Ask in plain language',
    body: 'Your question is embedded too, matched against the passages, and answered only from them.',
  },
  {
    title: 'Ship it to your site',
    body: 'Publish a document and the chat widget answers visitors from your own content.',
  },
]

const CAPABILITIES = [
  'Grounded answers with the matching passage shown under each one',
  'One-click summaries of any document',
  'Semantic search, not keyword matching',
  'A chat widget you embed with one script tag',
  'Isolated workspace per company, with team invites',
  'Android app for reading and asking on the go',
]

const FAQ = [
  {
    q: 'Do I need an account to try it?',
    a: 'No. The sandbox at /try runs in your browser. Create a workspace only when you want your files to persist.',
  },
  {
    q: 'What happens to what I upload in the sandbox?',
    a: 'It stays in that sandbox, is capped at a few files of a few megabytes, and is deleted when the session expires.',
  },
  {
    q: 'Where are the files kept?',
    a: 'In your own Postgres instance. Files are never shared between companies, and only documents you publish are visible to the widget.',
  },
]

function CopyableSnippet() {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(WIDGET_SNIPPET)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="min-w-0 rounded-md border border-stone-300 bg-stone-900">
      <div className="flex items-center justify-between border-b border-stone-700 px-3 py-1.5">
        <span className="font-mono text-[11px] text-stone-400">index.html</span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-[11px] text-stone-300 transition-colors hover:text-white"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-3 font-mono text-xs leading-relaxed text-stone-200">
        {WIDGET_SNIPPET}
      </pre>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-stone-50/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold tracking-tight">Smart PDF Workspace</span>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/try"
              className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-800"
            >
              Try it now — no signup
            </Link>
            <Link href="/login" className="text-stone-600 transition-colors hover:text-stone-900">
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-stone-700"
            >
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="outline-none">
        <section className="px-4 pb-10 pt-14 sm:pt-20">
          <div className="mx-auto max-w-5xl">
            <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Ask your PDFs real questions and get answers with the source passage.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-600">
              Upload documents, ask questions in normal language, and get answers built only from
              your own content. Publish a document and the same assistant answers visitors on your
              website.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/try"
                className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-800"
              >
                Try it now — no signup
              </Link>
              <Link
                href="/register"
                className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-900 transition-colors hover:border-stone-900"
              >
                Create a workspace
              </Link>
            </div>
            <p className="mt-3 text-xs text-stone-500">
              The demo sandbox is live at <span className="font-mono">/try</span>. No account, no card.
            </p>
          </div>
        </section>

        <section className="border-t border-stone-200 px-4 py-10 sm:py-14">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-xl font-semibold tracking-tight">How it works</h2>
            <ol className="mt-6 grid gap-6 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title}>
                  <p className="font-mono text-xs text-stone-400">0{i + 1}</p>
                  <h3 className="mt-1 text-sm font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-stone-200 px-4 py-10 sm:py-14">
          <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">What it does</h2>
              <ul className="mt-5 space-y-2.5">
                {CAPABILITIES.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-stone-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Good to know</h2>
              <dl className="mt-5 space-y-4">
                {FAQ.map((item) => (
                  <div key={item.q}>
                    <dt className="text-sm font-medium">{item.q}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-stone-600">{item.a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section id="widget" className="border-t border-stone-200 px-4 py-10 sm:py-14">
          <div className="mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Put it on your own site</h2>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">
                Publish a document and your visitors can ask questions about it from a chat bubble
                on your site. No iframe, no build step — one script tag, and the title, colour and
                side are configurable from settings.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">
                Only published documents are ever exposed. Everything else stays inside your
                workspace.
              </p>
            </div>
            <CopyableSnippet />
          </div>
        </section>

        <section className="border-t border-stone-200 px-4 py-10 sm:py-14">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">Android app</h2>
              <p className="mt-1 text-sm text-stone-600">
                Read your documents and ask questions from your phone. Free, 15 MB.
              </p>
            </div>
            <a
              href={APK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-900 transition-colors hover:border-stone-900"
            >
              <Download className="h-4 w-4" /> Download the APK
            </a>
          </div>
        </section>

        <section className="border-t border-stone-200 px-4 py-12">
          <div className="mx-auto max-w-5xl text-center">
            <h2 className="text-xl font-semibold tracking-tight">
              Want this running on your own documents?
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-stone-600">
              Create a workspace, upload a PDF, and ask the first question in under a minute.
            </p>
            <Link
              href="/register"
              className="mt-5 inline-block rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700"
            >
              Create a workspace
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-white px-4 py-5">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 text-xs text-stone-500">
          <p>&copy; {new Date().getFullYear()} Smart PDF Workspace</p>
          <p>
            Built by Djaouad Frih &middot; Want this for your business?{' '}
            <a
              href={PORTFOLIO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-stone-900 underline underline-offset-2 hover:text-red-700"
            >
              djaouad.is-a.dev
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}