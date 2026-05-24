'use client'

import AppSidebar from '@/components/common/app-sidebar.component'
import TutorialDialog from '@/components/tutorial/tutorial-dialog.component'
import { SidebarProvider } from '@/components/ui/sidebar.component'
import useFactionTheme from '@/hooks/use-faction-theme'
import { useSession } from '@/lib/auth.lib'
import { useAuthStore } from '@/stores/auth.store'
import { useTutorialStore } from '@/stores/tutorial.store'
import { useUserPreferencesStore, type DateFormat } from '@/stores/user-preferences.store'
import type { TutorialSlideId } from '@shared/schemas/onboarding.schemas'
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
  const queue = useTutorialStore((s) => s.queue)
  const sessionTotal = useTutorialStore((s) => s.sessionTotal)
  const setSeen = useTutorialStore((s) => s.setSeen)
  const closeCurrent = useTutorialStore((s) => s.closeCurrent)
  const enqueueMany = useTutorialStore((s) => s.enqueueMany)
  const [tutorialFromParam] = useState(() => searchParams.get('tutorial') === 'true')
  const [tutorialParamConsumed, setTutorialParamConsumed] = useState(false)
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
      defaultHabitsView: settings.defaultHabitsView,
      dateFormat: settings.dateFormat as DateFormat,
      showListTab: settings.showListTab,
      showKanbanTab: settings.showKanbanTab,
      showTableTab: settings.showTableTab,
      showMatrixTab: settings.showMatrixTab,
      showTodayTab: settings.showTodayTab,
      showHabitsListTab: settings.showHabitsListTab,
      showGridTab: settings.showGridTab,
      showHeatmapTab: settings.showHeatmapTab
    })
  }, [settings, setPreferences])

  useEffect(() => {
    if (character?.tutorialSlidesSeen) {
      setSeen(character.tutorialSlidesSeen as TutorialSlideId[])
    }
  }, [character?.tutorialSlidesSeen, setSeen])

  useEffect(() => {
    if (!tutorialFromParam || tutorialParamConsumed) return
    if (!session?.user) return
    if (character === undefined) return
    if (character === null) {
      enqueueMany(['character'])
    } else {
      const seen = (character.tutorialSlidesSeen as TutorialSlideId[] | undefined) ?? []
      const unseen = (['mana', 'combat', 'gear'] as TutorialSlideId[]).filter((s) => !seen.includes(s))
      if (unseen.length > 0) enqueueMany(unseen)
    }
    setTutorialParamConsumed(true)
    router.replace(pathname)
  }, [tutorialFromParam, tutorialParamConsumed, session?.user, character, enqueueMany, router, pathname])

  const markSeenMutation = useMutation(
    trpcOptions.character.markTutorialSlideSeen.mutationOptions({
      onError: () => toast.error(t('tutorial.complete_failed')),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() })
      }
    })
  )

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
  const currentSlide = queue[0] ?? null

  const handleSlideClose = () => {
    if (currentSlide) {
      markSeenMutation.mutate({ slideId: currentSlide })
    }
    const wasCharacterSlide = currentSlide === 'character'
    closeCurrent()
    if (wasCharacterSlide && !character) {
      router.push('/onboarding')
    }
  }

  const ctaLabel = currentSlide === 'character' ? t('tutorial.character.cta') : undefined

  return (
    <SidebarProvider className={factionClass}>
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <Layout>{mounted ? children : <div className="animate-in fade-in duration-500" />}</Layout>
      </main>
      <TutorialDialog
        slide={currentSlide}
        current={sessionTotal - queue.length}
        total={sessionTotal}
        ctaLabel={ctaLabel}
        onClose={handleSlideClose}
      />
    </SidebarProvider>
  )
}
