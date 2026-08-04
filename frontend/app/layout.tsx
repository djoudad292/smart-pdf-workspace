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
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
