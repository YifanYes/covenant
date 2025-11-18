import Snackbar from '@/components/Snackbar'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Outlet } from 'react-router'

export default function AppLayout() {
  return (
    <ThemeProvider>
      <Snackbar />
      <Outlet />
    </ThemeProvider>
  )
}
