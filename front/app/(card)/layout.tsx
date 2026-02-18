import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ARQ - Digital Card',
  description: 'Digital business card for the ARQ team'
}

export default function CardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <style>{`html, body { background-color: #363329 !important; }`}</style>
      <div className="min-h-screen bg-[#363329] text-[#d4b346]">{children}</div>
    </>
  )
}
