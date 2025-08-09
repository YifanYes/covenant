import { useEffect, useState } from 'react'

export const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    localStorage.theme === 'dark' ||
    (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ? 'dark'
      : 'light'
  )

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove(theme === 'dark' ? 'light' : 'dark')
    root.classList.add(theme)
    localStorage.theme = theme
  }, [theme])

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return { theme, toggleTheme }
}

export default useTheme
