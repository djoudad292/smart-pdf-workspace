'use client'

import { FileText, LayoutDashboard, Files, MessageSquare, Sparkles, Users, Settings, BookOpen, BarChart3, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TabKey =
  | 'overview'
  | 'documents'
  | 'ask'
  | 'analytics'
  | 'summaries'
  | 'team'
  | 'settings'
  | 'guide'

const NAV: { key: TabKey; label: string; icon: any }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'documents', label: 'Documents', icon: Files },
  { key: 'ask', label: 'Ask', icon: MessageSquare },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'summaries', label: 'Summaries', icon: Sparkles },
  { key: 'team', label: 'Team', icon: Users },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'guide', label: 'Guide', icon: BookOpen },
]

interface SidebarProps {
  active: TabKey
  onSelect: (tab: TabKey) => void
  workspaceName?: string
  user?: any
  onLogout: () => void
}

export function Sidebar({ active, onSelect, workspaceName, user, onLogout }: SidebarProps) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
      <div className="flex items-center gap-2 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
          <FileText className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">Smart PDF</p>
          <p className="truncate text-xs text-muted-foreground">{workspaceName || 'Workspace'}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map((item) => {
          const Icon = item.icon
          const isActive = active === item.key
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-primary/15 text-primaryText' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
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
            onClick={onLogout}
            aria-label="Sign out"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}

export { NAV }
