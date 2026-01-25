'use client'

import { ThemeContext } from '@/hooks/use-theme'
import { useLayoutEffect, useState, useEffect } from 'react'

type Theme = 'light' | 'dark'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  // Hydration safety - prevent flash on mount
  useEffect(() => {
    setMounted(true)
    const initialTheme =
      localStorage.theme === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ? 'dark'
        : 'light'
    setTheme(initialTheme)
  }, [])

  useLayoutEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement
    root.classList.remove(theme === 'dark' ? 'light' : 'dark')
    root.classList.add(theme)
    localStorage.theme = theme
  }, [theme, mounted])

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return <ThemeContext value={{ theme, toggleTheme }}>{children}</ThemeContext>
}
