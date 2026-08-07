'use client'

import { useEffect, useRef, useState } from 'react'
import { Menu, X, FileText, LogOut } from 'lucide-react'
import { NAV, type TabKey } from '@/components/sidebar'
import { cn } from '@/lib/utils'

interface MobileSidebarProps {
  active: TabKey
  onSelect: (tab: TabKey) => void
  user?: any
  onLogout: () => void
}

export function MobileSidebar({ active, onSelect, user, onLogout }: MobileSidebarProps) {
  const [open, setOpen] = useState(false)
  const openRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      openRef.current?.focus()
    }
  }, [open])

  const select = (tab: TabKey) => {
    onSelect(tab)
    setOpen(false)
  }

  return (
    <>
      <button
        ref={openRef}
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
        aria-controls="mobile-nav"
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card text-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div id="mobile-nav" role="dialog" aria-modal="true" aria-label="Navigation menu" className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-card">
            <div className="flex items-center justify-between px-6 py-5">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                  <FileText className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-sm font-bold text-foreground">Smart PDF</span>
              </div>
              <button
                ref={closeRef}
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
              {NAV.map((item) => {
                const Icon = item.icon
                const isActive = active === item.key
                return (
                  <button
                    key={item.key}
                    onClick={() => select(item.key)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </nav>

            <div className="border-t border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{user?.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setOpen(false)
                    onLogout()
                  }}
                  aria-label="Sign out"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
