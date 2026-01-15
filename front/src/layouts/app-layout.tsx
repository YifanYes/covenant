import { ThemeProvider } from '@/common'
import { Toaster } from '@/ui'
import { Outlet } from 'react-router'

export default function AppLayout() {
  return (
    <ThemeProvider>
      <Toaster />
      <Outlet />
    </ThemeProvider>
  )
}
