import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Try Smart PDF Workspace — live demo',
  description: 'Upload a PDF, ask questions, get grounded answers with sources. No signup, no card, instant sandbox.',
}

export default function TryLayout({ children }: { children: React.ReactNode }) {
  return children
}