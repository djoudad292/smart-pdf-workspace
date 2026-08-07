import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/toast'
import { AuthProvider } from '@/lib/auth-context'

export const metadata: Metadata = {
  title: 'Smart PDF Workspace',
  description: 'Ask questions across your PDF documents with AI.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
