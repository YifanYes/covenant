import { AppSidebar } from '@/common'
import { SidebarProvider } from '@/ui'
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
