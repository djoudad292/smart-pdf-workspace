'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Sidebar, NAV, type TabKey } from '@/components/sidebar'
import { MobileSidebar } from '@/components/mobile-sidebar'
import { useToast } from '@/components/toast'
import { OverviewView } from '@/components/views/overview-view'
import { DocumentsView } from '@/components/views/documents-view'
import { AskView } from '@/components/views/ask-view'
import { AnalyticsView } from '@/components/views/analytics-view'
import { SummariesView } from '@/components/views/summaries-view'
import { TeamView } from '@/components/views/team-view'
import { SettingsView } from '@/components/views/settings-view'
import { GuideView } from '@/components/views/guide-view'

export interface DocumentItem {
  id: string
  companyId: string
  title: string
  filename?: string
  mime?: string
  sizeBytes: number
  pageCount: number
  status: string
  summary?: string | null
  published: boolean
  error?: string | null
  createdAt: string
  updatedAt: string
}

export default function DashboardPage() {
  const { user, workspace, logout } = useAuth()
  const router = useRouter()
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)

  const loadDocuments = useCallback(async () => {
    try {
      const data = await apiFetch('/documents')
      setDocuments(data.items || [])
    } catch (err: any) {
      addToast(err.message || 'Failed to load documents', 'error')
    } finally {
      setLoadingDocs(false)
    }
  }, [addToast])

  useEffect(() => {
    if (!user) {
      router.replace('/login')
      return
    }
    loadDocuments()
  }, [user, router, loadDocuments])

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar active={activeTab} onSelect={setActiveTab} workspaceName={workspace?.name} user={user} onLogout={logout} />

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-background/80 px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <MobileSidebar active={activeTab} onSelect={setActiveTab} user={user} onLogout={logout} />
            <h1 className="text-lg font-bold text-foreground">{NAV.find((n) => n.key === activeTab)?.label ?? 'Overview'}</h1>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              {workspace?.name || 'Workspace'}
            </span>
          </div>
        </header>

        <main id="main" className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'overview' && (
            <OverviewView documents={documents} loading={loadingDocs} onNavigate={setActiveTab} />
          )}
          {activeTab === 'documents' && (
            <DocumentsView documents={documents} loading={loadingDocs} onRefresh={loadDocuments} />
          )}
          {activeTab === 'ask' && <AskView documents={documents} />}
          {activeTab === 'analytics' && <AnalyticsView />}
          {activeTab === 'summaries' && (
            <SummariesView documents={documents} onRefresh={loadDocuments} />
          )}
          {activeTab === 'team' && <TeamView />}
          {activeTab === 'settings' && <SettingsView />}
          {activeTab === 'guide' && <GuideView />}
        </main>
      </div>
    </div>
  )
}
