'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Settings, Save, Loader2, Palette, Type, AlignLeft } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/toast'
import { WidgetPreview } from '@/components/widget-preview'

interface Company {
  id: string
  name: string
  settings?: Record<string, any>
}

export function SettingsView() {
  const { workspace } = useAuth()
  const { addToast } = useToast()
  const [company, setCompany] = useState<Company | null>(null)
  const [title, setTitle] = useState('Ask our documents')
  const [color, setColor] = useState('#EF4444')
  const [position, setPosition] = useState<'left' | 'right'>('right')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiFetch<Company>('/companies/profile')
        setCompany(data)
        const w = data.settings?.widget || {}
        setTitle(w.title || 'Ask our documents')
        setColor(w.color || '#EF4444')
        setPosition(w.position === 'left' ? 'left' : 'right')
      } catch (err: any) {
        addToast(err.message || 'Failed to load settings', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [addToast])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await apiFetch('/companies/settings', {
        method: 'PATCH',
        body: JSON.stringify({ widget: { title, color, position } }),
      })
      addToast('Widget settings saved', 'success')
    } catch (err: any) {
      addToast(err.message || 'Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary-text" />
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold text-foreground">
              <Settings className="h-4 w-4 text-primary-text" /> Workspace
            </h2>
          </div>
          <div className="space-y-3 p-5 text-sm">
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Company</span>
              <span className="font-medium text-foreground">{company?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Company ID</span>
              <span className="font-mono text-xs text-foreground">{company?.id}</span>
            </div>
          </div>
        </div>

        <form onSubmit={save} className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold text-foreground">
              <Palette className="h-4 w-4 text-primary-text" /> Ask-your-docs widget
            </h2>
          </div>

          <div className="space-y-4 p-5">
            <div>
              <label htmlFor="widget-title" className="mb-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Type className="h-3.5 w-3.5" /> Widget title
              </label>
              <input id="widget-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
            </div>

            <div>
              <label htmlFor="accent-color" className="mb-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Palette className="h-3.5 w-3.5" /> Accent color
              </label>
              <div className="flex items-center gap-3">
                <input id="accent-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-secondary" />
                <input type="text" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Accent color hex value" className={inputClass} />
              </div>
            </div>

            <fieldset>
              <legend className="mb-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <AlignLeft className="h-3.5 w-3.5" /> Position
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {(['right', 'left'] as const).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setPosition(pos)}
                    aria-pressed={position === pos}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
                      position === pos
                        ? 'border-primary bg-primary/15 text-primary-text'
                        : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save settings
            </button>
          </div>
        </form>
      </div>

      <div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 font-semibold text-foreground">Live preview</h3>
          <WidgetPreview title={title} color={color} position={position} />
        </div>
      </div>
    </div>
  )
}
