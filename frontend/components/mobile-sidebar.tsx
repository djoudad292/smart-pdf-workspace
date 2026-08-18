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
  const dialogRef = useRef<HTMLDivElement>(null)

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

  function select(tab: TabKey) {
    onSelect(tab)
    setOpen(false)
  }

  return (
    <>
      {/* Hamburger button - always visible on mobile */}
      <button
        ref={openRef}
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-secondary active:scale-95 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <div
        ref={dialogRef}
        className={cn(
          'fixed inset-y-0 left-0 z-[70] flex w-72 flex-col bg-card shadow-2xl transition-transform duration-250 ease-out lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">Smart PDF</p>
              <p className="truncate text-xs text-muted-foreground">{user?.companyName || 'Workspace'}</p>
            </div>
          </div>
          <button
            ref={closeRef}
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:scale-95"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-0.5">
            {NAV.map((item) => {
              const Icon = item.icon
              const isActive = active === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => select(item.key)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary/15 text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground active:bg-secondary/80'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 shrink-0 transition-colors',
                      isActive ? 'text-primaryText' : 'text-muted-foreground'
                    )}
                  />
                  {item.label}
                </button>
              )
            })}
          </div>
        </nav>

        {/* User / Logout */}
        <div className="border-t border-border p-3">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:bg-secondary/80"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Log out
          </button>
        </div>
      </div>
    </>
  )
}
