'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getApiUrl } from '@/lib/api'

/**
 * Full-screen branded splash shown on the landing page until the frontend has
 * mounted AND the backend health endpoint responds.  Matches the landing
 * page's stone / crimson palette.  No auth — dismissal is automatic on a
 * successful health probe, or manual via Escape / "Enter anyway" (after 45 s).
 */
export function WakeSplash() {
  const [visible, setVisible] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [showEnterAnyway, setShowEnterAnyway] = useState(false)

  const mountedAtRef = useRef<number>(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevOverflowRef = useRef<string>('')

  const handleDismiss = useCallback(() => {
    if (dismissed) return
    setDismissed(true)
  }, [dismissed])

  /* 1. Mount time + elapsed counter + Enter-anyway flag + scroll lock */
  useEffect(() => {
    mountedAtRef.current = Date.now()
    prevOverflowRef.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    intervalRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - mountedAtRef.current) / 1000)
      setElapsed(secs)
      if (secs >= 45) setShowEnterAnyway(true)
    }, 250)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      document.body.style.overflow = prevOverflowRef.current
    }
  }, [])

  /* 2. Health-check polling — 2.5 s between checks, 8 s per-request timeout */
  useEffect(() => {
    if (dismissed) return

    let active = true

    const checkHealth = async () => {
      if (!active) return
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      try {
        // Any HTTP response (even non-200) means the backend is answering.
        await fetch(`${getApiUrl()}/api/health`, {
          signal: controller.signal,
          cache: 'no-store',
        })
        clearTimeout(timeout)
        handleDismiss()
      } catch {
        clearTimeout(timeout)
        // Network error or abort — keep polling
      }
    }

    const tick = async () => {
      if (!active) return
      await checkHealth()
      if (active && !dismissed) {
        pollTimerRef.current = setTimeout(tick, 2500)
      }
    }

    pollTimerRef.current = setTimeout(tick, 250)

    return () => {
      active = false
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    }
  }, [dismissed, handleDismiss])

  /* 3. Escape key to dismiss (only while not yet dismissed) */
  useEffect(() => {
    if (dismissed) return
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss()
    }
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [dismissed, handleDismiss])

  /* 4. Fade-out + unmount after dismissal (min 600 ms visible, 350 ms fade) */
  useEffect(() => {
    if (!dismissed) return
    const ms = Date.now() - mountedAtRef.current
    const minVisible = Math.max(0, 600 - ms)
    const timer = setTimeout(() => {
      setVisible(false)
    }, minVisible + 350)
    return () => clearTimeout(timer)
  }, [dismissed])

  if (!visible) return null

  const statusText =
    elapsed >= 15 ? 'First visit may take a moment.' : 'Waking the demo services…'

  return (
    <div
      className={
        'fixed inset-0 z-50 flex flex-col items-center justify-center ' +
        'bg-stone-50 text-stone-900 ' +
        'transition-opacity duration-[350ms] ease-in-out ' +
        (dismissed ? 'opacity-0' : 'opacity-100')
      }
    >
      <div className="flex flex-col items-center gap-4">
        <span className="text-xl font-semibold tracking-tight">Smart PDF Workspace</span>
        <Loader2 className="h-5 w-5 animate-spin text-red-700" />
        <p className="text-sm text-stone-600">{statusText}</p>
        <span className="text-xs text-stone-500 tabular-nums">{elapsed}s</span>
        {showEnterAnyway && (
          <button
            onClick={handleDismiss}
            className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-800"
          >
            Enter anyway
          </button>
        )}
      </div>
    </div>
  )
}
