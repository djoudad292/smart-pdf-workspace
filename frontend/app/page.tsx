'use client'

import Link from 'next/link'
import { FileText, MessageSquare, Sparkles, Search, Globe, ArrowRight, BrainCircuit, Zap, Smartphone, Download, Code2, Shield, Bot } from 'lucide-react'
import { DemoChat } from '@/components/demo-chat'

const APK_URL = "https://github.com/djoudad292/smart-pdf-workspace/releases/download/latest-apk-pdf/smart-pdf.apk";

const features = [
  {
    icon: FileText,
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
];

const mobileFeatures = [
  { icon: FileText, title: "Interactive PDF Reader", desc: "View and browse your workspace documents on any screen size." },
  { icon: Zap, title: "Instant Mobile Search", desc: "Ask questions on the go with real-time vector search." },
  { icon: Shield, title: "Secure Document Store", desc: "Your sensitive files are safely stored in your private Postgres instance." },
  { icon: Globe, title: "Access Anywhere", desc: "Stay connected to your knowledge base from anywhere in the world." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-50">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-slate-800 bg-[#0a0f1a]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-100">Smart PDF Workspace</span>
          </div>
          <div className="flex items-center gap-3">
            <a href={APK_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/20 transition-colors">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Android App</span>
            </a>
            <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">Sign in</Link>
            <Link href="/register" className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 transition-colors">Get started</Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 pt-24 pb-12 sm:pt-32 sm:pb-20">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-500/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-500/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            {/* Left - Text */}
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
                <Zap className="h-3 w-3" />
                Ask questions across your PDFs with AI
              </div>
              <h1 className="mb-4 text-3xl font-bold leading-tight sm:text-5xl">
                Smart PDF Workspace
                <span className="block text-blue-500">Ask, summarize, and embed your docs</span>
              </h1>
              <p className="mb-6 max-w-lg text-base text-slate-400 sm:text-lg">
                Upload your documents, get instant summaries, and let visitors ask questions
                through an embeddable widget powered by your own knowledge base.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-600 transition-colors">
                  Start free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors">
                  Sign in
                </Link>
              </div>
            </div>

            {/* Right - Phone Mockup with Download */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[280px] sm:max-w-sm">
                {/* Phone Frame */}
                <div className="relative rounded-[2.5rem] border-4 border-slate-700 bg-[#111827] p-2 shadow-2xl shadow-blue-500/10">
                  {/* Notch */}
                  <div className="mx-auto mb-3 h-5 w-24 rounded-full bg-slate-800" />
                  
                  {/* Screen */}
                  <div className="overflow-hidden rounded-[2rem] bg-[#0B1120]">
                    {/* Status Bar */}
                    <div className="flex items-center justify-between px-6 py-2 text-[10px] text-slate-500">
                      <span>9:41</span>
                      <div className="flex items-center gap-1">
                        <div className="h-2.5 w-4 rounded-sm border border-slate-600">
                          <div className="h-full w-3/4 rounded-sm bg-green-500" />
                        </div>
                      </div>
                    </div>

                    {/* Chat Preview */}
                    <div className="px-3 pb-4 space-y-3">
                      {/* Bot Header */}
                      <div className="flex items-center gap-2 px-2 py-2 border-b border-slate-800">
                        <div className="h-6 w-6 rounded-full bg-blue-600/20 flex items-center justify-center">
                          <Bot className="h-3 w-3 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-white">SmartPDF AI</p>
                          <p className="text-[9px] text-green-400">Online</p>
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="space-y-2">
                        <div className="flex gap-1.5">
                          <div className="h-5 w-5 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Bot className="h-2.5 w-2.5 text-blue-400" />
                          </div>
                          <div className="rounded-xl rounded-bl-md bg-slate-800 border border-slate-700 px-3 py-2 text-[10px] text-slate-200 leading-relaxed max-w-[80%]">
                            Hi! Ask me anything about your uploaded PDF documents. I'll summarize or answer instantly.
                          </div>
                        </div>

                        {/* Quick Replies */}
                        <div className="flex flex-wrap gap-1 ml-6">
                          {["Summarize Doc", "Search Knowledge Base", "Close Workspace"].map((b) => (
                            <span key={b} className="rounded-full bg-blue-600/20 border border-blue-500/30 px-2 py-0.5 text-[8px] font-medium text-blue-300">
                              {b}
                            </span>
                          ))}
                        </div>

                        {/* User Message */}
                        <div className="flex justify-end">
                          <div className="rounded-xl rounded-br-md bg-blue-600 px-3 py-2 text-[10px] text-white max-w-[75%]">
                            Give me a summary of Chapter 2
                          </div>
                        </div>

                        {/* Bot Response */}
                        <div className="flex gap-1.5">
                          <div className="h-5 w-5 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Bot className="h-2.5 w-2.5 text-blue-400" />
                          </div>
                          <div className="rounded-xl rounded-bl-md bg-slate-800 border border-slate-700 px-3 py-2 text-[10px] text-slate-200 leading-relaxed max-w-[80%]">
                            Based on your guide, Chapter 2 details the deployment process and environment variables setup.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Download Card */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 sm:-right-8 sm:left-auto sm:translate-x-0 w-[calc(100%-2rem)] sm:w-auto">
                  <a href={APK_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-[#111827] p-4 shadow-xl hover:border-green-500/30 transition-all group">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/20">
                      <Download className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white group-hover:text-green-400 transition-colors">Download for Android</p>
                      <p className="text-[11px] text-slate-500">Free · 15 MB · Android 8.0+</p>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile App Section */}
      <section className="px-4 py-16 sm:py-24 border-t border-slate-800/40">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
              <Smartphone className="h-3 w-3" />
              Native Android App
            </div>
            <h2 className="mb-3 text-2xl font-bold sm:text-3xl">Manage Documents from Your Phone</h2>
            <p className="mx-auto max-w-lg text-slate-400">
              Your smart PDF workspace, now in your pocket. View documents, ask questions with cited sources, and generate summaries on the go.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {mobileFeatures.map((f) => (
              <div key={f.title} className="rounded-xl border border-slate-800 bg-[#111827] p-5 transition-colors hover:border-slate-700">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                  <f.icon className="h-5 w-5 text-green-400" />
                </div>
                <h3 className="mb-2 text-sm font-semibold">{f.title}</h3>
                <p className="text-xs leading-relaxed text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <a href={APK_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-green-500/20 hover:shadow-green-500/30 transition-all">
              <Download className="h-4 w-4" />
              Download the Android App
            </a>
            <p className="mt-3 text-xs text-slate-500">Free forever · Auto-updates via GitHub · 15 MB</p>
          </div>
        </div>
      </section>

      {/* Try Live Demo */}
      <section className="px-4 py-16 sm:py-20 border-t border-slate-800/40">
        <div className="mx-auto max-w-6xl grid items-center gap-12 md:grid-cols-2">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
              <Zap className="h-3 w-3" /> Live Demo
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Try it right now</h2>
            <p className="mt-4 text-base text-slate-400">
              This chat is powered by the real backend. Ask a question and watch it pull the answer from a published document with retrieval + an LLM — the same experience your visitors get from the embeddable widget.
            </p>
          </div>
          <DemoChat />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-4 py-16 sm:py-20 border-t border-slate-800/40">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-2xl font-bold sm:text-3xl">Everything you need to master your PDFs</h2>
          <p className="mb-12 text-center text-slate-400 max-w-xl mx-auto">Upload PDFs, retrieve semantically with source citations, generate summaries and invite your team.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-slate-800 bg-[#111827] p-6 transition-colors hover:border-slate-700">
                <f.icon className="mb-3 h-8 w-8 text-blue-500" />
                <h3 className="mb-2 text-base font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 sm:py-20 border-t border-slate-800/40">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-[#111827] p-8 text-center sm:p-12">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl">Ready to automate document research?</h2>
          <p className="mb-6 text-slate-400">Create a free account, add your knowledge base, and start asking questions in minutes. No credit card needed.</p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-600 transition-colors">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href={APK_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-8 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors">
              <Download className="h-4 w-4" />
              Download Android App
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-4 py-8 text-center text-sm text-slate-500">
        &copy; {new Date().getFullYear()} Smart PDF Workspace &mdash; Built by{' '}
        <a href="https://djaouad.tech" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-400 hover:underline">djaouad frih</a>
      </footer>
    </div>
  )
}
