import Snackbar from '@/components/Snackbar'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Outlet } from 'react-router'

export default function AppLayout() {
  return (
    <>
      <ThemeToggle />
      <Snackbar />
      <Outlet />
    </>
  )
}
