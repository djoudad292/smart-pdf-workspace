'use client'

import Link from 'next/link'
import { FileText, MessageSquare, Sparkles, Search, Globe, ArrowRight, BrainCircuit, Zap, Smartphone, Download, Code2 } from 'lucide-react'
import { DemoChat } from '@/components/demo-chat'

const APK_URL = "https://github.com/djoudad292/smart-pdf-workspace/releases/download/latest-apk-pdf/smart-pdf.apk";

const features = [
  {
    icon: BrainCircuit,
    title: 'Ask Questions',
    description: 'Chat with your PDFs and get answers grounded in your documents with inline citations.',
  },
  {
    icon: Search,
    title: 'Semantic Search',
    description: 'Find exactly what you need across thousands of pages using vector similarity search.',
  },
  {
    icon: Sparkles,
    title: 'AI Summarization',
    description: 'Generate concise summaries of long documents or specific sections instantly.',
  },
  {
    icon: MessageSquare,
    title: 'Team Collaboration',
    description: 'Share workspaces, annotate documents, and leave comments for your team.',
  },
  {
    icon: Globe,
    title: 'Embeddable Widget',
    description: 'Add an AI-powered chat widget to your website or product with one line of code.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Built on pgvector and optimized retrieval — answers in milliseconds, not seconds.',
  },
]

const steps = [
  { num: "1", title: "Upload PDFs", desc: "Drag and drop PDFs, scans, or docs. OCR runs automatically on images." },
  { num: "2", title: "Ask Anything", desc: "Type a question. The AI searches your docs and cites exact sources." },
  { num: "3", title: "Share & Embed", desc: "Invite your team or embed the widget on your site for customers." },
]

const mobileFeatures = [
  { icon: MessageSquare, title: "Chat with Documents", desc: "Ask questions about your PDFs and get cited answers on mobile." },
  { icon: Search, title: "Instant Search", desc: "Find information across all documents with semantic search." },
  { icon: Sparkles, title: "Summarize Anywhere", desc: "Generate summaries of long reports directly from your phone." },
  { icon: Code2, title: "Widget in Pocket", desc: "Manage your embeddable AI widget and monitor usage on the go." },
]

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
            <span className="text-lg font-semibold text-slate-100">Smart PDF Workspace</span>
          </div>
          <div className="flex items-center gap-3">
            <a href={APK_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/20 transition-colors">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Android App</span>
            </a>
            <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">Sign In</Link>
            <Link href="/register" className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors">Get Started</Link>
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
                AI-Powered Document Intelligence
              </div>
              <h1 className="mb-4 text-3xl font-bold leading-tight sm:text-5xl">
                Smart PDF Workspace
                <span className="block text-blue-500">Ask, Search & Summarize Your Documents</span>
              </h1>
              <p className="mb-6 max-w-lg text-base text-slate-400 sm:text-lg">
                Upload PDFs, ask questions, and get AI answers grounded in your documents with source citations.
                Team management, embeddable widget, and analytics dashboard included.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-600 transition-colors">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors">
                  View Dashboard
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
                        <div className="h-6 w-6 rounded-full bg-purple-600/20 flex items-center justify-center">
                          <Sparkles className="h-3 w-3 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-white">SmartPDF AI</p>
                          <p className="text-[9px] text-green-400">Online</p>
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="space-y-2">
                        <div className="flex gap-1.5">
                          <div className="h-5 w-5 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Sparkles className="h-2.5 w-2.5 text-purple-400" />
                          </div>
                          <div className="rounded-xl rounded-bl-md bg-slate-800 border border-slate-700 px-3 py-2 text-[10px] text-slate-200 leading-relaxed max-w-[80%]">
                            Upload a PDF and I'll help you find answers, summarize, or search across your documents.
                          </div>
                        </div>

                        {/* Quick Replies */}
                        <div className="flex flex-wrap gap-1 ml-6">
                          {["Summarize Document", "Search Contracts", "Extract Data"].map((b) => (
                            <span key={b} className="rounded-full bg-purple-600/20 border border-purple-500/30 px-2 py-0.5 text-[8px] font-medium text-purple-300">
                              {b}
                            </span>
                          ))}
                        </div>

                        {/* User Message */}
                        <div className="flex justify-end">
                          <div className="rounded-xl rounded-br-md bg-blue-600 px-3 py-2 text-[10px] text-white max-w-[75%]">
                            Summarize the quarterly report
                          </div>
                        </div>

                        {/* Bot Response with citations */}
                        <div className="flex gap-1.5">
                          <div className="h-5 w-5 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Sparkles className="h-2.5 w-2.5 text-purple-400" />
                          </div>
                          <div className="rounded-xl rounded-bl-md bg-slate-800 border border-slate-700 px-3 py-2 text-[10px] text-slate-200 leading-relaxed max-w-[80%]">
                            Q3 Revenue: $2.4M (+12% YoY). Key drivers: new enterprise deals and expansion...
                            <span className="text-xs text-blue-400 ml-1">[p.3, p.7]</span>
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
                      <p className="text-[11px] text-slate-500">Free · 18 MB · Android 8.0+</p>
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
            <h2 className="mb-3 text-2xl font-bold sm:text-3xl">Your Documents, In Your Pocket</h2>
            <p className="mx-auto max-w-lg text-slate-400">
              Access your PDF workspace anywhere. Search, summarize, and chat with documents on the go.
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
            <p className="mt-3 text-xs text-slate-500">Free forever · Auto-updates via GitHub · 18 MB</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-4 py-16 sm:py-20 border-t border-slate-800/40">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-2xl font-bold sm:text-3xl">Document Intelligence Features</h2>
          <p className="mb-12 text-center text-slate-400 max-w-xl mx-auto">Built for teams that need fast, accurate answers from their documents.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-slate-800 bg-[#111827] p-6 transition-colors hover:border-slate-700">
                <f.icon className="mb-3 h-8 w-8 text-blue-500" />
                <h3 className="mb-2 text-base font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="px-4 py-16 sm:py-20 border-t border-slate-800/40">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-2xl font-bold sm:text-text-3xl">How it works</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.num} className="rounded-xl border border-slate-800 bg-[#111827] p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 font-bold">{s.num}</div>
                <h3 className="mb-2 font-semibold text-slate-100">{s.title}</h3>
                <p className="text-sm text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 sm:py-20 border-t border-slate-800/40">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-[#111827] p-8 text-center sm:p-12">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl">Ready to unlock your documents?</h2>
          <p className="mb-6 text-slate-400">Create a free account, upload your first PDF, and start asking questions in minutes.</p>
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