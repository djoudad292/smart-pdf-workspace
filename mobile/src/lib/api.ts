import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_URL } from './theme'

const ACCESS_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'

export const getApiUrl = () => API_URL

export async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return (await AsyncStorage.getItem(key)) || null
    } catch {
      return null
    }
  }
  return SecureStore.getItemAsync(key)
}

export async function storageSet(key: string, value: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value)
  } else {
    await SecureStore.setItemAsync(key, value)
  }
}

export async function storageDelete(key: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key)
  } else {
    await SecureStore.deleteItemAsync(key)
  }
}

export async function getAccessToken(): Promise<string | null> {
  return storageGet(ACCESS_KEY)
}

export async function setAccessToken(token: string | null) {
  if (token) await storageSet(ACCESS_KEY, token)
  else await storageDelete(ACCESS_KEY)
}

export async function getRefreshToken(): Promise<string | null> {
  return storageGet(REFRESH_KEY)
}

export async function setRefreshToken(token: string | null) {
  if (token) await storageSet(REFRESH_KEY, token)
  else await storageDelete(REFRESH_KEY)
}

export async function setTokens(access: string, refresh: string) {
  await setAccessToken(access)
  await setRefreshToken(refresh)
}

export async function clearTokens() {
  await setAccessToken(null)
  await setRefreshToken(null)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 45000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function warmUpBackend(
  maxAttempts = 30,
  delayMs = 2000,
  onStatus?: (attempt: number, max: number) => void,
) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    onStatus?.(attempt, maxAttempts)
    try {
      const res = await fetchWithTimeout(`${API_URL}/api/health`, {}, 15000)
      if (res.ok) return true
    } catch {
      // still booting or unreachable — keep polling
    }
    await sleep(delayMs)
  }
  return false
}

let refreshPromise: Promise<boolean> | null = null

async function doRefresh(): Promise<boolean> {
  const refresh = await getRefreshToken()
  if (!refresh) return false
  try {
    const res = await fetchWithTimeout(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    }, 15000)
    if (!res.ok) return false
    const data = await res.json()
    await setTokens(data.accessToken, data.refreshToken)
    return true
  } catch {
    return false
  }
}

async function refreshTokens(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

export async function apiFetch<T = any>(path: string, options?: RequestInit): Promise<T> {
  const access = await getAccessToken()
  const body = options?.body
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  const headers: Record<string, string> = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...((options?.headers as Record<string, string>) || {}),
  }
  if (access) headers.Authorization = `Bearer ${access}`

  let res = await fetchWithTimeout(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401 && (await getRefreshToken())) {
    const ok = await refreshTokens()
    if (ok) {
      const fresh = await getAccessToken()
      headers.Authorization = `Bearer ${fresh}`
      res = await fetchWithTimeout(`${API_URL}${path}`, { ...options, headers })
    }
  }

  if (!res.ok) {
    let message = 'Request failed'
    try {
      const error = await res.json()
      message = error.message || error.error || message
      if (Array.isArray(message)) message = message.join(', ')
    } catch {}
    const err = new Error(message)
    ;(err as any).status = res.status
    if (res.status === 401 && path !== '/auth/login') {
      await clearTokens()
    }
    throw err
  }

  return res.json() as Promise<T>
}

export function paginate<T = any>(data: any): { items: T[]; total: number; page: number; perPage: number } {
  if (Array.isArray(data)) return { items: data as T[], total: data.length, page: 1, perPage: data.length }
  if (data && Array.isArray(data.items)) {
    return { items: data.items as T[], total: data.total ?? data.items.length, page: data.page ?? 1, perPage: data.perPage ?? data.items.length }
  }
  return { items: [], total: 0, page: 1, perPage: 50 }
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function formatDate(iso?: string): string {
  try {
    return new Date(iso || '').toLocaleDateString()
  } catch {
    return ''
  }
}

export function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  } catch {
    return ''
  }
}
