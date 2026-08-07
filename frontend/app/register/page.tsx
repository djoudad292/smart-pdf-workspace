'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { warmUpBackend } from '@/lib/api'
import { FileText, Loader2 } from 'lucide-react'
import { useToast } from '@/components/toast'

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
  })
  const [loading, setLoading] = useState(false)
  const [waking, setWaking] = useState(false)
  const { register } = useAuth()
  const { addToast } = useToast()
  const router = useRouter()

  const update = (key: string) => (e: any) => {
    const value = e.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setWaking(true)
    try {
      await warmUpBackend()
      setWaking(false)
      await register(form.name, form.email, form.password, form.companyName)
      addToast('Workspace created successfully', 'success')
      router.push('/dashboard')
    } catch (err: any) {
      addToast(err.message || 'Failed to create workspace', 'error')
    } finally {
      setWaking(false)
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'

  return (
    <div id="main" className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <FileText className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Create your workspace</h1>
          <p className="mt-2 text-sm text-muted-foreground">Start asking questions about your PDFs</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
              Your name
            </label>
            <input id="name" name="name" type="text" autoComplete="name" value={form.name} onChange={update('name')} placeholder="Jane Doe" required className={inputClass} />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
              Email
            </label>
            <input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={update('email')} placeholder="you@company.com" required className={inputClass} />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
              Password
            </label>
            <input id="password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={update('password')} placeholder="At least 8 characters" required minLength={8} className={inputClass} />
          </div>

          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-foreground mb-1">
              Company name
            </label>
            <input id="companyName" name="companyName" type="text" autoComplete="organization" value={form.companyName} onChange={update('companyName')} placeholder="Acme Inc." required className={inputClass} />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {waking ? 'Starting server… this can take up to a minute' : 'Creating workspace…'}
              </>
            ) : (
              'Create Workspace'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary-text hover:text-primary-text/80 transition-colors">
            Sign in
          </Link>
        </p>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Demo by{' '}
          <a href="https://djaouad.tech" target="_blank" rel="noopener noreferrer" className="text-primary-text hover:underline">
            djaouad.tech
          </a>{' '}
          &mdash; Built by{' '}
          <a href="https://djaouad.tech" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-text hover:underline">
            djaouad frih
          </a>
        </p>
      </div>
    </div>
  )
}
