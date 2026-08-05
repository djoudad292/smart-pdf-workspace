'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageSquare, Send, Sparkles, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getApiUrl } from '@/lib/api'

const API_URL = getApiUrl()
const DEMO_COMPANY_ID = 'demo'
const ACCENT = '#6366f1'

const SUGGESTIONS = [
  'How do I upload a PDF?',
  'How do I publish my documents?',
  'Can my team ask questions too?',
  'How do I customize the widget?',
]

interface Message {
  role: 'user' | 'assistant'
  text: string
}

function revealAnswer(text: string, onTick: (partial: string) => void, onDone: () => void) {
  let i = 0
  const words = text.split(' ')
  const timer = setInterval(() => {
    i += 1
    onTick(words.slice(0, i).join(' '))
    if (i >= words.length) {
      clearInterval(timer)
      onDone()
    }
  }, 24)
  return timer
}

export function DemoChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: "Hi! I'm the Smart PDF Workspace assistant. This is a live demo — I'm answering from the product guide using real retrieval and an LLM. Try one of the questions below, or ask your own.",
    },
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [revealing, setRevealing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking, revealing])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const ask = async (raw?: string) => {
    const question = (raw ?? input).trim()
    if (!question || thinking || revealing) return
    if (timerRef.current) clearInterval(timerRef.current)

    setMessages((prev) => [...prev, { role: 'user', text: question }])
    setInput('')
    setThinking(true)

    let answer = ''
    try {
      const res = await fetch(`${API_URL}/widget/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: DEMO_COMPANY_ID, question }),
      })
      const data = await res.json()
      answer = data.answer || 'Something went wrong. Please try again.'
    } catch {
      answer = 'Could not reach the demo backend. Please try again in a moment.'
    }

    setThinking(false)
    setRevealing(true)
    const placeholder = { role: 'assistant' as const, text: '' }
    setMessages((prev) => [...prev, placeholder])
    timerRef.current = revealAnswer(
      answer,
      (partial) => {
        setMessages((prev) => {
          const next = [...prev]
          next[next.length - 1] = { role: 'assistant', text: partial }
          return next
        })
      },
      () => {
        setRevealing(false)
        timerRef.current = null
      },
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-primary/10">
      <div className="flex items-center gap-2.5 px-5 py-4 text-white" style={{ backgroundColor: ACCENT }}>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Smart PDF Workspace</p>
          <p className="text-[11px] text-white/75">Live demo — grounded answers</p>
        </div>
        <button
          onClick={() => {
            if (timerRef.current) clearInterval(timerRef.current)
            setRevealing(false)
            setThinking(false)
            setMessages((prev) => prev.slice(0, 1))
          }}
          className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          title="Reset demo"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex h-80 flex-col gap-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
              m.role === 'user' ? 'ml-auto text-white' : 'bg-secondary text-foreground',
            )}
            style={m.role === 'user' ? { backgroundColor: ACCENT } : undefined}
          >
            {m.text || ' '}
          </div>
        ))}

        {thinking && (
          <div className="flex items-center gap-1.5 self-start rounded-2xl bg-secondary px-4 py-3">
            <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:0ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:120ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:240ms]" />
          </div>
        )}
      </div>

      {messages.length <= 1 && !thinking && (
        <div className="flex flex-wrap gap-2 px-4 pb-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-border p-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <MessageSquare className="h-4 w-4 text-primary" />
        </div>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder="Ask about the product…"
          className="flex-1 rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={() => ask()}
          disabled={thinking || revealing || !input.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition-opacity disabled:opacity-40"
          style={{ backgroundColor: ACCENT }}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
