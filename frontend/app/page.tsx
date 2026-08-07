'use client'

import Link from 'next/link'
import { FileText, MessageSquare, Sparkles, Search, Globe, ArrowRight, BrainCircuit, Zap } from 'lucide-react'
import { DemoChat } from '@/components/demo-chat'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">Smart PDF Workspace</span>
        </div>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
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

      <main id="main" className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="py-16 sm:py-20 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary animate-pulse-glow">
            <FileText className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mx-auto max-w-3xl text-[clamp(2rem,6vw,3.75rem)] font-bold leading-tight tracking-tight text-foreground animate-fade-in-up">
            Ask questions across your PDFs with AI
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg animate-fade-in-up-delay-1">
            Upload your documents, get instant summaries, and let visitors ask questions
            through an embeddable widget powered by your own knowledge base.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row animate-fade-in-up-delay-2">
            <Link
              href="/register"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors sm:w-auto"
            >
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="flex w-full items-center justify-center rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors sm:w-auto"
            >
              Sign in
            </Link>
          </div>
        </section>

        <section className="grid items-center gap-12 pb-24 md:grid-cols-2">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              <Zap className="h-3.5 w-3.5" /> Live demo
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Try it right now
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              This chat is powered by the real backend. Ask a question and watch it pull the
              answer from a published document with retrieval + an LLM — the same experience
              your visitors get from the embeddable widget.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2"><Search className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Answers are grounded in the indexed product guide — no hallucinations.</li>
              <li className="flex gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Sources are retrieved semantically, not by keyword matching.</li>
              <li className="flex gap-2"><Globe className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Embed the same experience on your site with a one-line script.</li>
            </ul>
          </div>
          <DemoChat />
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
