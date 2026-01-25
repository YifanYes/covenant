import AppSidebar from '@/common/app-sidebar.component'
import { SidebarProvider } from '@/ui/sidebar.component'
import { Outlet } from 'react-router'

export default function WorkspaceLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className='flex-1 p-2'>
        <Outlet />
      </main>
    </SidebarProvider>
  )
}
