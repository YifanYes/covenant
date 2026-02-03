'use client'

import AppSidebar from '@/components/common/app-sidebar.component'
import { SidebarProvider } from '@/components/ui/sidebar.component'
import useFactionTheme from '@/hooks/use-faction-theme'
import { useSession } from '@/lib/auth.lib'
import { useAuthStore } from '@/stores/auth.store'
import { Loader } from '@nsmr/pixelart-react'
import { usePathname } from 'next/navigation'
import { useEffect, useSyncExternalStore } from 'react'
import ProductivityLayout from './productivity-layout'
import RPGLayout from './rpg-layout'

const RPG_ROUTES = ['/map', '/inventory', '/shop', '/investments']

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending: isSessionPending } = useSession()
  const updateUserInfo = useAuthStore((state) => state.updateUserInfo)
  const pathname = usePathname()
  const { factionClass } = useFactionTheme()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  useEffect(() => {
    if (session?.user) {
      updateUserInfo({
        email: session.user.email || '',
        userId: session.user.id
      })
    }
  }, [session, updateUserInfo])

  // Show loading while checking auth or not mounted
  if (!mounted || isSessionPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader className="h-10 w-10 animate-spin" />
      </div>
    )
  }

  const isRPGRoute = RPG_ROUTES.some((route) => pathname.startsWith(route))
  const Layout = isRPGRoute ? RPGLayout : ProductivityLayout

  return (
    <SidebarProvider className={factionClass}>
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <Layout>{children}</Layout>
      </main>
    </SidebarProvider>
  )
}
