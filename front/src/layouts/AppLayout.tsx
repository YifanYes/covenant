import { ThemeProvider } from '@/components/ThemeProvider'
import Toaster from '@/components/ui/toaster'
import { Outlet } from 'react-router'

export default function AppLayout() {
  return (
    <ThemeProvider>
      <Toaster />
      <Outlet />
    </ThemeProvider>
  )
}
