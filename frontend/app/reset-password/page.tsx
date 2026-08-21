'use client'

import { useState, type FormEvent, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import { FileText, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/components/toast'
import { Button, Input, Card } from '@supportai/ui/web'

function ResetForm() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const { addToast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  useEffect(() => {
    if (!token) {
      addToast('Missing reset token', 'error')
      router.push('/forgot-password')
    }
  }, [token, router, addToast])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token) return
    setLoading(true)
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword: password }),
      })
      setDone(true)
    } catch (err: any) {
      addToast(err.message || 'Failed to reset password', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center text-center py-4">
        <CheckCircle2 className="h-12 w-12 text-success mb-3" />
        <h2 className="text-lg font-semibold text-fg">Password updated</h2>
        <p className="mt-2 text-sm text-fg-muted">You can now sign in with your new password.</p>
        <Link href="/login" className="mt-4 text-sm font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input id="password" label="New Password" type="password" name="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} />
      <Button type="submit" loading={loading} fullWidth>Reset Password</Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div id="main" className="flex min-h-screen items-center justify-center bg-bg p-4 outline-none">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <FileText className="h-6 w-6 text-primary-fg" />
          </div>
          <h1 className="text-2xl font-bold text-fg">Choose a new password</h1>
          <p className="mt-2 text-sm text-fg-muted">Make it strong and unique</p>
        </div>

        <Card className="p-6">
          <Suspense fallback={<div className="py-8 text-center text-sm text-fg-muted">Loading…</div>}>
            <ResetForm />
          </Suspense>
        </Card>
      </div>
    </div>
  )
}
