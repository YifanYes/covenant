'use client'

import { FactionThemeContext, useFactionThemeProvider } from '@/hooks/use-faction-theme'
import { ThemeContext } from '@/hooks/use-theme'
import { Faction } from '@shared/constants/factions'
import { useLayoutEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

export default function ThemeProvider({
  children,
  initialTheme,
  initialFaction
}: {
  children: React.ReactNode
  initialTheme: Theme
  initialFaction: Faction
}) {
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const factionTheme = useFactionThemeProvider({ initialFaction })

  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.remove(theme === 'dark' ? 'light' : 'dark')
    root.classList.add(theme)
    localStorage.theme = theme
    document.cookie = `theme=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
  }, [theme])

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext value={{ theme, toggleTheme }}>
      <FactionThemeContext value={factionTheme}>{children}</FactionThemeContext>
    </ThemeContext>
  )
}
