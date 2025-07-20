import Snackbar from '@/components/Snackbar'
import { Outlet } from 'react-router'

export default function AppLayout() {
  return (
    <>
      <Snackbar />
      <Outlet />
    </>
  )
}
