'use client'

import Link from 'next/link'
import { GuestPlayground } from '@/components/guest-playground'
import { WakeSplash } from '@/components/wake-splash'

export default function TryPage() {
  return (
    <>
      <WakeSplash />
      <div className="min-h-screen bg-stone-50 text-stone-900">
        <header className="sticky top-0 z-40 border-b border-stone-200 bg-stone-50/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <span className="text-sm font-semibold tracking-tight">Smart PDF Workspace</span>
            <nav className="flex items-center gap-4 text-sm">
              <a href="/" className="text-stone-600 transition-colors hover:text-stone-900">
                Home
              </a>
              <Link
                href="/register"
                className="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-stone-700"
              >
                Create account
              </Link>
            </nav>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="outline-none">
          <section className="px-4 pb-10 pt-14 sm:pt-20">
            <div className="mx-auto max-w-5xl">
              <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Try the product — full feature sandbox
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-600">
                This is a live, isolated workspace. Upload a PDF, ask questions, generate summaries,
                and see source passages — all without an account. The sandbox expires automatically.
              </p>
              <p className="mt-3 text-xs text-stone-500">
                No login, no card, nothing shared. Every visitor gets their own sandbox.
              </p>
            </div>
          </section>

          <section className="border-t border-stone-200 px-4 py-10 sm:py-14">
            <div className="mx-auto max-w-5xl">
              <GuestPlayground />
            </div>
          </section>

          <section className="border-t border-stone-200 px-4 py-10 sm:py-14">
            <div className="mx-auto max-w-5xl text-center">
              <h2 className="text-xl font-semibold tracking-tight">
                Want your documents to persist?
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-stone-600">
                Create a workspace to keep your files, invite your team, and publish documents to
                the chat widget on your site.
              </p>
              <Link
                href="/register"
                className="mt-5 inline-block rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700"
              >
                Create a workspace
              </Link>
            </div>
          </section>
        </main>

        <footer className="border-t border-stone-200 bg-white px-4 py-5">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 text-xs text-stone-500">
            <p>&copy; {new Date().getFullYear()} Smart PDF Workspace</p>
            <p>
              Built by Djaouad Frih &middot;{' '}
              <a
                href="https://djaouad.is-a.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-stone-900 underline underline-offset-2 hover:text-red-700"
              >
                djaouad.is-a.dev
              </a>
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}