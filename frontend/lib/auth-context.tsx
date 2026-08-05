'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, clearTokens, setTokens, getStoredWorkspace, setStoredWorkspace, getApiUrl } from '@/lib/api'

interface AuthContextType {
  user: any
  workspace: any
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, companyName: string) => Promise<void>
  logout: () => Promise<void>
  isOwner: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<any>(() => getStoredWorkspace()?.user || null)
  const [workspace, setWorkspace] = useState<any>(() => getStoredWorkspace()?.company || null)

  const applyWorkspace = useCallback((data: any) => {
    const next = { user: data.user, company: data.company }
    setStoredWorkspace(next)
    setUser(data.user)
    setWorkspace(data.company)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setTokens(data.accessToken, data.refreshToken)
      applyWorkspace(data)
      try {
        const company = await apiFetch('/companies/profile')
        setStoredWorkspace({ user: data.user, company })
        setWorkspace(company)
      } catch {}
    },
    [applyWorkspace]
  )

  const register = useCallback(
    async (name: string, email: string, password: string, companyName: string) => {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, companyName }),
      })
      setTokens(data.accessToken, data.refreshToken)
      applyWorkspace(data)
    },
    [applyWorkspace]
  )

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' })
    } catch {}
    clearTokens()
    setUser(null)
    setWorkspace(null)
    router.push('/login')
  }, [router])

  const isOwner = !!user?.isOwner

  return (
    <AuthContext.Provider value={{ user, workspace, login, register, logout, isOwner }}>
      {children}
    </AuthContext.Provider>
  )
}

export { getApiUrl }
