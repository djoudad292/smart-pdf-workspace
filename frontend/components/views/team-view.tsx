'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Users, UserPlus, Loader2, Trash2, Shield, Mail } from 'lucide-react'
import { apiFetch, formatDate } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/toast'

interface UserRow {
  id: string
  email: string
  name: string
  role: string
  companyId?: string
  createdAt: string
}

interface AgentRow {
  id: string
  userId: string
  isOnline: boolean
}

interface Member {
  user: UserRow
  agentId?: string
}

export function TeamView() {
  const { isOwner } = useAuth()
  const { addToast } = useToast()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '' })

  const load = async () => {
    try {
      const [users, agents] = await Promise.all([
        apiFetch<UserRow[]>('/users'),
        apiFetch<AgentRow[]>('/agents'),
      ])
      const byUser = new Map(agents.map((a) => [a.userId, a.id]))
      setMembers(
        users.map((u) => ({
          user: u,
          agentId: byUser.get(u.id),
        }))
      )
    } catch (err: any) {
      addToast(err.message || 'Failed to load team', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const invite = async (e: FormEvent) => {
    e.preventDefault()
    if (!isOwner) return
    setInviting(true)
    try {
      await apiFetch('/agents/invite', {
        method: 'POST',
        body: JSON.stringify({ name: form.name, email: form.email }),
      })
      addToast('Invitation sent — the new agent received a temporary password by email', 'success')
      setForm({ name: '', email: '' })
      await load()
    } catch (err: any) {
      addToast(err.message || 'Failed to invite agent', 'error')
    } finally {
      setInviting(false)
    }
  }

  const remove = async (member: Member) => {
    if (!member.agentId) {
      addToast('Owner accounts cannot be removed', 'info')
      return
    }
    if (!confirm(`Remove ${member.user.email} from this workspace?`)) return
    setRemovingId(member.user.id)
    try {
      await apiFetch(`/agents/${member.agentId}`, { method: 'DELETE' })
      addToast('Agent removed', 'success')
      await load()
    } catch (err: any) {
      addToast(err.message || 'Failed to remove agent', 'error')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold text-foreground">
              <Users className="h-4 w-4 text-primary" /> Team members
            </h2>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-secondary" />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {members.map((member) => (
                <li key={member.user.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {member.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
                      {member.user.name}
                      {member.user.role === 'COMPANY_ADMIN' && (
                        <span className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                          <Shield className="h-3 w-3" /> Owner
                        </span>
                      )}
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" /> {member.user.email}
                    </p>
                  </div>
                  <span className="hidden text-xs text-muted-foreground sm:block">Joined {formatDate(member.user.createdAt)}</span>
                  {isOwner && (
                    <button
                      onClick={() => remove(member)}
                      disabled={removingId === member.user.id}
                      className="flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      {removingId === member.user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {isOwner && (
        <div>
          <div className="rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="flex items-center gap-2 font-semibold text-foreground">
                <UserPlus className="h-4 w-4 text-primary" /> Invite a teammate
              </h2>
            </div>
            <form onSubmit={invite} className="space-y-4 p-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Alex Rivera"
                  required
                  className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="alex@company.com"
                  required
                  className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                type="submit"
                disabled={inviting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Send invitation
              </button>
              <p className="text-xs text-muted-foreground">
                The invited teammate receives a temporary password by email and signs in with their email address.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
