import { AppSidebar } from '@/components/AppSidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Outlet } from 'react-router'

export default function WorkspaceLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className='w-full p-2'>
        <SidebarTrigger className='dark:hover:bg-accent' />
        <Outlet />
      </main>
    </SidebarProvider>
  )
}
