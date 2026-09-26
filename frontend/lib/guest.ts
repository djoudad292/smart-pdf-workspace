import { getApiUrl } from './api'

/**
 * Client for the public guest sandbox. The session lives in localStorage, is
 * tied to one visitor, and is discarded the moment it expires. It is stored
 * separately from the tenant JWT so signing in or out of a real account can
 * never clobber it — and the tenant token is never sent to these endpoints.
 */

const STORAGE_KEY = 'guest_sandbox'

export interface GuestSession {
  token: string
  companyId: string
  expiresAt: string
  limits: { ttlMinutes: number; maxFileBytes: number; maxUploads: number }
}

export interface GuestDocument {
  id: string
  title: string
  pageCount: number
  sizeBytes: number
  status: string
  summary?: string | null
  isSample: boolean
  createdAt: string
}

export interface GuestSource {
  chunkText: string
  similarity: number
  documentTitle?: string | null
}

export class GuestSessionExpiredError extends Error {}

/**
 * Wraps fetch so a network-level failure (connection refused, DNS, timeout)
 * produces a human-friendly message instead of a raw TypeError.
 * HTTP error responses (4xx/5xx) are still handled by parse().
 */
async function safeFetch(input: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(input, init)
  } catch {
    throw new Error('The demo API is waking up — try again in a few seconds.')
  }
}

export function getGuestSession(): GuestSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as GuestSession
    if (!session?.token || !session?.companyId) return null
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      clearGuestSession()
      return null
    }
    return session
  } catch {
    return null
  }
}

export function setGuestSession(session: GuestSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearGuestSession() {
  localStorage.removeItem(STORAGE_KEY)
}

async function parse<T>(res: Response): Promise<T> {
  let payload: any = null
  try {
    payload = await res.json()
  } catch {
    payload = null
  }
  if (res.status === 401) {
    clearGuestSession()
    throw new GuestSessionExpiredError(payload?.message || 'Guest session expired')
  }
  if (!res.ok) {
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message || 'Request failed'
    throw new Error(message)
  }
  return payload as T
}

async function guestFetch<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const sessionToken = token ?? getGuestSession()?.token
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }
  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`
  return parse<T>(await safeFetch(`${getApiUrl()}/guest${path}`, { ...options, headers }))
}

async function guestUpload<T>(path: string, body: FormData): Promise<T> {
  const session = getGuestSession()
  const headers: Record<string, string> = {}
  if (session) headers.Authorization = `Bearer ${session.token}`
  return parse<T>(await safeFetch(`${getApiUrl()}/guest${path}`, { method: 'POST', headers, body }))
}

export async function startGuestSession(): Promise<GuestSession> {
  const res = await safeFetch(`${getApiUrl()}/guest/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  const session = await parse<GuestSession>(res)
  setGuestSession(session)
  return session
}

export async function endGuestSession(): Promise<void> {
  const session = getGuestSession()
  clearGuestSession()
  if (!session) return
  try {
    // The token is passed explicitly: it is already out of storage.
    await guestFetch<{ success: boolean }>('/session/end', { method: 'POST' }, session.token)
  } catch {
    // The sandbox is gone either way — it also expires on its own.
  }
}

export async function loadGuestDocuments() {
  return guestFetch<{ documents: GuestDocument[]; uploadsUsed: number; uploadsLeft: number }>(
    '/documents',
  )
}

export async function uploadGuestDocument(file: File) {
  const form = new FormData()
  form.append('file', file)
  return guestUpload<{ id: string; title: string; status: string; error?: string | null }>(
    '/documents',
    form,
  )
}

export async function deleteGuestDocument(id: string) {
  return guestFetch<{ success: boolean }>(`/documents/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function summarizeGuestDocument(id: string) {
  return guestFetch<{ summary: string }>(`/documents/${encodeURIComponent(id)}/summarize`, {
    method: 'POST',
  })
}

export async function askGuest(question: string) {
  return guestFetch<{ answer: string; sources: GuestSource[] }>('/ask', {
    method: 'POST',
    body: JSON.stringify({ question }),
  })
}
