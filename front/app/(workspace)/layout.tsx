'use client'

import AppSidebar from '@/components/common/app-sidebar.component'
import { SidebarProvider } from '@/components/ui/sidebar.component'

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 p-2">
        {children}
      </main>
    </SidebarProvider>
  );
}
