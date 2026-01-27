'use client'

import AppSidebar from '@/components/common/app-sidebar.component'
import { useSession } from '@/lib/auth.lib'
import { useAuthStore } from '@/stores/auth.store'
import { SidebarProvider } from '@/components/ui/sidebar.component'
import { useEffect } from 'react'

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession()
  const updateUserInfo = useAuthStore((state) => state.updateUserInfo)

  useEffect(() => {
    if (session?.user) {
      updateUserInfo({
        email: session.user.email || '',
        userId: session.user.id
      })
    }
  }, [session, updateUserInfo])

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 p-2">
        {children}
      </main>
    </SidebarProvider>
  );
}
