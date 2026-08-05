const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

function getTokens() {
  if (typeof window === 'undefined') return null
  return {
    access: localStorage.getItem('access_token'),
    refresh: localStorage.getItem('refresh_token'),
  }
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)
}

export function clearTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

export function getApiUrl() {
  return API_URL
}

export function getStoredWorkspace() {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem('workspace') || 'null')
  } catch {
    return null
  }
}

export function setStoredWorkspace(workspace: any) {
  localStorage.setItem('workspace', JSON.stringify(workspace))
}

async function refreshTokens(): Promise<boolean> {
  const tokens = getTokens()
  if (!tokens?.refresh) return false
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: tokens.refresh }),
  })
  if (!res.ok) return false
  const data = await res.json()
  setTokens(data.accessToken, data.refreshToken)
  return true
}

let refreshing: Promise<boolean> | null = null

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const tokens = getTokens()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (tokens?.access) headers.Authorization = `Bearer ${tokens.access}`

  let res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (res.status === 401 && tokens?.refresh) {
    if (!refreshing) {
      refreshing = refreshTokens().finally(() => {
        refreshing = null
      })
    }
    const ok = await refreshing
    if (ok) {
      const fresh = getTokens()
      headers.Authorization = `Bearer ${fresh?.access}`
      res = await fetch(`${API_URL}${path}`, { ...options, headers })
    }
  }

  if (res.status === 401 && path !== '/auth/refresh') {
    clearTokens()
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new Error('Session expired')
  }

  if (!res.ok) {
    let message = 'Something went wrong'
    try {
      const data = await res.json()
      message = data.message || data.error || message
      if (Array.isArray(message)) message = message.join(', ')
    } catch {}
    throw new Error(message)
  }

  return res.json()
}

export async function apiUpload<T = any>(path: string, body: FormData): Promise<T> {
  const tokens = getTokens()
  const headers: Record<string, string> = {}
  if (tokens?.access) headers.Authorization = `Bearer ${tokens.access}`

  let res = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body })

  if (res.status === 401 && tokens?.refresh) {
    if (!refreshing) {
      refreshing = refreshTokens().finally(() => {
        refreshing = null
      })
    }
    const ok = await refreshing
    if (ok) {
      const fresh = getTokens()
      headers.Authorization = `Bearer ${fresh?.access}`
      res = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body })
    }
  }

  if (res.status === 401) {
    clearTokens()
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new Error('Session expired')
  }

  if (!res.ok) {
    let message = 'Something went wrong'
    try {
      const data = await res.json()
      message = data.message || data.error || message
      if (Array.isArray(message)) message = message.join(', ')
    } catch {}
    throw new Error(message)
  }

  return res.json()
}

export async function warmUpBackend(maxAttempts = 40, delayMs = 2000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 30000)
      const res = await fetch(`${API_URL}/api/health`, { signal: controller.signal })
      clearTimeout(timer)
      if (res.ok) return true
    } catch {
      // still booting (connection refused / timeout) — keep waiting
    }
    await new Promise((r) => setTimeout(r, delayMs))
  }
  return false
}

export function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function formatDate(dateStr?: string) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
