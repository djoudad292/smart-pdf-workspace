'use client'

import Link from 'next/link'
import { FileText, MessageSquare, Sparkles, Search, Globe, ArrowRight, BrainCircuit } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">Smart PDF Workspace</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get started
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="py-20 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary animate-pulse-glow">
            <FileText className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight text-foreground animate-fade-in-up">
            Ask questions across your PDFs with AI
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground animate-fade-in-up-delay-1">
            Upload your documents, get instant summaries, and let visitors ask questions
            through an embeddable widget powered by your own knowledge base.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 animate-fade-in-up-delay-2">
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              Sign in
            </Link>
          </div>
        </section>

        <section className="grid gap-6 pb-20 md:grid-cols-3">
          {[
            {
              icon: Upload,
              title: 'Upload PDFs',
              desc: 'Store files in Postgres, extract text, and index every paragraph into searchable embeddings.',
            },
            {
              icon: MessageSquare,
              title: 'Ask your documents',
              desc: 'Get grounded answers with sources from your own knowledge base — no hallucinated facts.',
            },
            {
              icon: Sparkles,
              title: 'Instant summaries',
              desc: 'One click generates a concise summary of any uploaded document.',
            },
            {
              icon: Search,
              title: 'Smart retrieval',
              desc: 'Semantic search finds the most relevant passages, not just keywords.',
            },
            {
              icon: Globe,
              title: 'Embeddable widget',
              desc: 'A one-line snippet puts an ask-your-docs assistant on any website.',
            },
            {
              icon: BrainCircuit,
              title: 'Multi-tenant by design',
              desc: 'Every company gets an isolated workspace, agent invites, and its own settings.',
            },
          ].map((feature, i) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className={`rounded-2xl border border-border bg-card p-6 hover:border-primary/50 transition-colors animate-fade-in-up-delay-${Math.min(i + 1, 3)}`}
              >
                <Icon className="mb-4 h-6 w-6 text-primary" />
                <h3 className="mb-2 font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            )
          })}
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Demo by{' '}
        <a href="https://djaouad.tech" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          djaouad.tech
        </a>{' '}
        &mdash; Built by{' '}
        <a href="https://djaouad.tech" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
          djaouad frih
        </a>
      </footer>
    </div>
  )
}

function Upload() {
  return <FileText className="h-6 w-6" />
}
