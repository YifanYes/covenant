import type { Metadata } from 'next'
import Navbar from './_components/navbar.component'

export const metadata: Metadata = {
  title: 'ARQ - Transform Your Productivity Into Real Power',
  description:
    'A gamified productivity app where every task, every habit, and every goal you complete forges your character. No shortcuts. No excuses. Only results you can see, measure, and equip.',
  keywords: [
    'productivity',
    'gamification',
    'task management',
    'habit tracker',
    'RPG',
    'goal setting',
    'personal development'
  ],
  openGraph: {
    title: 'ARQ - Transform Your Productivity Into Real Power',
    description:
      'A gamified productivity app where every task, every habit, and every goal you complete forges your character.',
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'es_ES'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ARQ - Transform Your Productivity Into Real Power',
    description:
      'A gamified productivity app where every task, every habit, and every goal you complete forges your character.'
  },
  robots: {
    index: true,
    follow: true
  }
}

export default function LandingLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <Navbar />
      {children}
    </>
  )
}
