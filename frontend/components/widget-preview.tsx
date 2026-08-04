'use client'

import { useState } from 'react'
import { MessageSquare, Send, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WidgetPreviewProps {
  title: string
  color: string
  position: 'left' | 'right'
}

export function WidgetPreview({ title, color, position }: WidgetPreviewProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const ask = async () => {
    const question = input.trim()
    if (!question) return
    setMessages((prev) => [...prev, { role: 'user', text: question }])
    setInput('')
    setLoading(true)
    await new Promise((r) => setTimeout(r, 900))
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        text: 'This is a preview of the ask-your-docs widget. Visitors to your site will get answers grounded in your published documents.',
      },
    ])
    setLoading(false)
  }

  const isRight = position === 'right'

  return (
    <div className="relative h-[480px] w-full overflow-hidden rounded-2xl border border-border bg-secondary/50">
      <div className="flex h-12 items-center gap-2 border-b border-border px-4">
        <span className="h-2 w-2 rounded-full bg-red-400" />
        <span className="h-2 w-2 rounded-full bg-yellow-400" />
        <span className="h-2 w-2 rounded-full bg-green-400" />
        <span className="ml-3 text-xs text-muted-foreground">yourwebsite.com</span>
      </div>

      <div className="flex h-[calc(100%-3rem)] items-center justify-center">
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105"
            style={{ backgroundColor: color }}
          >
            <MessageSquare className="h-4 w-4" />
            {title}
          </button>
        ) : (
          <div className="flex h-full w-full flex-col bg-card">
            <div
              className="flex items-center justify-between px-4 py-3 text-white"
              style={{ backgroundColor: color }}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm font-semibold">{title}</span>
              </div>
              <button onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  Preview mode — ask anything and a mock reply appears.
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn('max-w-[85%] rounded-2xl px-3 py-2 text-sm', m.role === 'user' ? 'ml-auto text-white' : 'bg-secondary text-foreground')}
                  style={m.role === 'user' ? { backgroundColor: color } : undefined}
                >
                  {m.text}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-border p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && ask()}
                placeholder="Ask a question…"
                className="flex-1 rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={ask}
                disabled={loading || !input.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-white transition-opacity disabled:opacity-40"
                style={{ backgroundColor: color }}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <span className={cn('absolute bottom-4 text-[10px] text-muted-foreground/60', isRight ? 'right-4' : 'left-4')}>
        position: {position}
      </span>
    </div>
  )
}
