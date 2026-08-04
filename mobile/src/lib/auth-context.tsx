import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { apiFetch, getAccessToken, setTokens, clearTokens, storageGet, storageSet, storageDelete } from './api'

export interface User {
  id: string
  email: string
  name: string
  role: string
  companyId: string
}

export interface Company {
  id: string
  name: string
  slug: string
  plan?: string
  settings?: Record<string, any>
}

interface AuthContextType {
  user: User | null
  company: Company | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, companyName: string) => Promise<void>
  logout: () => Promise<void>
  refreshCompany: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        const storedToken = await getAccessToken()
        if (storedToken) {
          const storedUser = await storageGet('user')
          if (storedUser) setUser(JSON.parse(storedUser))
          const storedCompany = await storageGet('company')
          if (storedCompany) setCompany(JSON.parse(storedCompany))
        }
      } catch {
        // ignore corrupted storage
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [])

  const persist = useCallback(async (user: User, company?: Company) => {
    await storageSet('user', JSON.stringify(user))
    if (company) await storageSet('company', JSON.stringify(company))
  }, [])

  const refreshCompany = useCallback(async () => {
    try {
      const company = await apiFetch<Company>('/companies/profile')
      setCompany(company)
      await storageSet('company', JSON.stringify(company))
    } catch {
      // ignore
    }
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      await setTokens(data.accessToken, data.refreshToken)
      await persist(data.user)
      setUser(data.user)
      await refreshCompany()
    },
    [persist, refreshCompany]
  )

  const register = useCallback(
    async (name: string, email: string, password: string, companyName: string) => {
      const data = await apiFetch<{ user: User; company: Company; accessToken: string; refreshToken: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, companyName }),
      })
      await setTokens(data.accessToken, data.refreshToken)
      await persist(data.user, data.company)
      setUser(data.user)
      setCompany(data.company)
    },
    [persist]
  )

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {})
    } catch {
      // ignore
    }
    await clearTokens()
    await storageDelete('user')
    await storageDelete('company')
    setUser(null)
    setCompany(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, company, isLoading, isAuthenticated: !!user, login, register, logout, refreshCompany }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
