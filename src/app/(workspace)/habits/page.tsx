'use client'

import EmptyState from '@/components/empty-state.component'
import { useUserPreferencesStore } from '@/stores/user-preferences.store'
import Button from '@/ui/button.component'
import Tabs, { TabsContent, TabsList, TabsTrigger } from '@/ui/tabs.component'
import { trpcOptions } from '@/utils/trpc.utils'
import { HABITS_VIEWS, type HabitsView } from '@shared/schemas/auth.schemas'
import { useSuspenseQuery } from '@tanstack/react-query'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Plus, Repeat } from 'pixelarticons/react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CreateHabitDialog from './_components/create-habit-dialog.component'
import HabitHeatmap from './_components/habit-heatmap.component'
import HabitList from './_components/habit-list.component'
import HabitToday from './_components/habit-today.component'
import HabitsSettingsForm from './_components/habits-settings-form.component'
import UpdateHabitDialog from './_components/update-habit-dialog.component'

const SETTINGS_VIEW = 'settings' as const
type TabValue = HabitsView | typeof SETTINGS_VIEW

const isHabitsView = (v: string | null): v is HabitsView =>
  v !== null && (HABITS_VIEWS as readonly string[]).includes(v)

const isTabValue = (v: string | null): v is TabValue => v === SETTINGS_VIEW || isHabitsView(v)

export default function Habits() {
  const { t } = useTranslation()
  const { data } = useSuspenseQuery(trpcOptions.habits.getAll.queryOptions())
  const { defaultHabitsView, showTodayTab, showHabitsListTab, showGridTab, showHeatmapTab } = useUserPreferencesStore()
  const [createOpen, setCreateOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const visibleViews = useMemo<HabitsView[]>(() => {
    const flags: Record<HabitsView, boolean> = {
      today: showTodayTab,
      list: showHabitsListTab,
      grid: showGridTab,
      heatmap: showHeatmapTab
    }
    const visible = HABITS_VIEWS.filter((v) => flags[v])
    return visible.length > 0 ? visible : [HABITS_VIEWS[0]]
  }, [showTodayTab, showHabitsListTab, showGridTab, showHeatmapTab])

  const viewParam = searchParams.get('view')
  const defaultView: HabitsView = isHabitsView(defaultHabitsView)
    ? visibleViews.includes(defaultHabitsView)
      ? defaultHabitsView
      : visibleViews[0]
    : visibleViews[0]
  const activeView: TabValue = isTabValue(viewParam) ? viewParam : defaultView

  const handleViewChange = useCallback(
    (value: string) => {
      if (!isTabValue(value)) return
      const params = new URLSearchParams(searchParams.toString())
      params.set('view', value)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const isEmpty = (data?.habits?.length ?? 0) === 0

  if (isEmpty) {
    return (
      <div className="min-h-screen w-full p-6">
        <div className="flex flex-row justify-between gap-4">
          <h1 className="text-2xl font-semibold">{t('habits.title')}</h1>
          <CreateHabitDialog open={createOpen} onOpenChange={setCreateOpen} />
        </div>
        <EmptyState
          size="default"
          icon={<Repeat className="h-8 w-8" />}
          title={t('habits.empty_state.title')}
          description={t('habits.empty_state.description')}
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              <span>{t('habits.empty_state.action')}</span>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="h-[calc(100dvh-3rem)] w-full p-6">
      <Tabs value={activeView} onValueChange={handleViewChange} className="flex h-full w-full flex-col">
        <div className="flex flex-row items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">{t('habits.title')}</h1>
          <div className="flex items-center gap-4">
            <TabsList>
              {visibleViews.map((view) => (
                <TabsTrigger key={view} value={view}>
                  {t(`habits.tabs.${view}`)}
                </TabsTrigger>
              ))}
              <TabsTrigger value={SETTINGS_VIEW}>{t('habits.settings.tab_label')}</TabsTrigger>
            </TabsList>
            <CreateHabitDialog open={createOpen} onOpenChange={setCreateOpen} />
          </div>
        </div>

        <TabsContent value="today" className="mt-4 flex-1 overflow-hidden">
          <HabitToday />
        </TabsContent>

        <TabsContent value="list" className="mt-4 flex-1 overflow-hidden">
          <HabitList />
        </TabsContent>

        <TabsContent value="grid" className="mt-4 flex-1 overflow-y-auto">
          <div className="3xl:grid-cols-6 grid grid-cols-1 gap-4 py-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-5">
            {data?.habits?.map((habit) => (
              <UpdateHabitDialog key={habit.id} habit={habit} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="heatmap" className="mt-4 flex-1 overflow-hidden">
          <HabitHeatmap />
        </TabsContent>

        <TabsContent value={SETTINGS_VIEW} className="mt-4">
          <HabitsSettingsForm />
        </TabsContent>
      </Tabs>
    </div>
  )
}
