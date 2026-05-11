'use client'

import { Pixelify_Sans, Press_Start_2P } from 'next/font/google'
import React from 'react'
import 'nes.css/css/nes.min.css'

// Phase 2A: RPG views use Pixelify Sans for body copy (12-14px is readable) and Press Start 2P
// for display-only headings at 24px+. Both loaded via next/font/google and exposed as CSS vars
// so the .rpg-ui scope can reference them without leaking into productivity views.
const pixelifySans = Pixelify_Sans({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-rpg-body',
  display: 'swap'
})

const pressStart2P = Press_Start_2P({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-rpg-display',
  display: 'swap'
})

export default function RPGLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`rpg-ui ${pixelifySans.variable} ${pressStart2P.variable} flex flex-col min-h-screen animate-in fade-in duration-500`}>
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</div>
    </div>
  )
}
