import type { ReactNode } from 'react'

export default function LegalPageLayout({ children }: { children: ReactNode }) {
  return (
    <main className="bg-background min-h-screen pt-16">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <article className="prose prose-invert max-w-none">{children}</article>
      </div>
    </main>
  )
}
