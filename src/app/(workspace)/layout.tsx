'use client'

import AppSidebar from '@/components/common/app-sidebar.component'
import TutorialDialog from '@/components/tutorial/tutorial-dialog.component'
import { SidebarProvider } from '@/components/ui/sidebar.component'
import useFactionTheme from '@/hooks/use-faction-theme'
import { useSession } from '@/lib/auth.lib'
import { useAuthStore } from '@/stores/auth.store'
import { useTutorialStore } from '@/stores/tutorial.store'
import { useUserPreferencesStore, type DateFormat } from '@/stores/user-preferences.store'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { useMutation, useQuery } from '@tanstack/react-query'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import ProductivityLayout from './productivity-layout'
import RPGLayout from './rpg-layout'

const RPG_ROUTES = ['/quests', '/inventory', '/shop', '/guilds', '/tavern']

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const { t } = useTranslation()
  const updateUserInfo = useAuthStore((state) => state.updateUserInfo)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { factionClass } = useFactionTheme()
  const manuallyClosed = useTutorialStore((s) => s.manuallyClosed)
  const setClosed = useTutorialStore((s) => s.setClosed)
  const reopen = useTutorialStore((s) => s.reopen)
  const [tutorialFromParam] = useState(() => searchParams.get('tutorial') === 'true')
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const { data: character } = useQuery({
    ...trpcOptions.character.getCurrentClass.queryOptions(),
    enabled: !!session?.user
  })

  const { data: profile } = useQuery({
    ...trpcOptions.auth.getProfile.queryOptions(),
    enabled: !!session?.user
  })

  const setPreferences = useUserPreferencesStore((s) => s.setPreferences)
  const settings = profile?.userSettings
  useEffect(() => {
    if (!settings) return
    setPreferences({
      language: settings.locale,
      defaultTasksView: settings.defaultTasksView,
      dateFormat: settings.dateFormat as DateFormat,
      showListTab: settings.showListTab,
      showKanbanTab: settings.showKanbanTab,
      showTableTab: settings.showTableTab,
      showMatrixTab: settings.showMatrixTab
    })
  }, [settings, setPreferences])

  const completeMutation = useMutation(
    trpcOptions.character.completeTutorial.mutationOptions({
      onMutate: () => {
        setClosed()
      },
      onError: () => {
        reopen()
        toast.error(t('tutorial.complete_failed'))
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() })
      }
    })
  )

  const open = !manuallyClosed && (tutorialFromParam || (!!character && character.tutorialCompletedAt === null))

  useEffect(() => {
    if (tutorialFromParam) {
      router.replace(pathname)
    }
    // run once on mount to strip ?tutorial=true without re-triggering on navigation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (session?.user) {
      updateUserInfo({
        email: session.user.email || '',
        userId: session.user.id
      })
    }
  }, [session, updateUserInfo])

  const isRPGRoute = RPG_ROUTES.some((route) => pathname.startsWith(route))
  const Layout = isRPGRoute ? RPGLayout : ProductivityLayout

  return (
    <SidebarProvider className={factionClass}>
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <Layout>{mounted ? children : <div className="animate-in fade-in duration-500" />}</Layout>
      </main>
      <TutorialDialog open={open} onComplete={() => completeMutation.mutate()} />
    </SidebarProvider>
  )
}
