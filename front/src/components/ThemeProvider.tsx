import { ThemeContext } from '@/hooks/use-theme'
import { useLayoutEffect, useState } from 'react'

type Theme = 'light' | 'dark'

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Initialize theme synchronously
    const initialTheme =
      localStorage.theme === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ? 'dark'
        : 'light'

    // Apply theme class immediately during render
    const root = window.document.documentElement
    root.classList.remove(initialTheme === 'dark' ? 'light' : 'dark')
    root.classList.add(initialTheme)

    return initialTheme
  })

  useLayoutEffect(() => {
    // Update theme class when theme changes (synchronously before paint)
    const root = window.document.documentElement
    root.classList.remove(theme === 'dark' ? 'light' : 'dark')
    root.classList.add(theme)
    localStorage.theme = theme
  }, [theme])

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return <ThemeContext value={{ theme, toggleTheme }}>{children}</ThemeContext>
}
