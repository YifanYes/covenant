import ThemeProvider from '@/common/theme-provider.component'
import Toaster from '@/ui/toaster.component'
import { Outlet } from 'react-router'

export default function AppLayout() {
  return (
    <ThemeProvider>
      <Toaster />
      <Outlet />
    </ThemeProvider>
  )
}
