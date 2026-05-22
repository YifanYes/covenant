'use client'
import { useUserPreferencesStore } from '@/stores/user-preferences.store'
import Tabs, { TabsContent, TabsList, TabsTrigger } from '@/ui/tabs.component'
import { TASKS_VIEWS, type TasksView } from '@shared/schemas/auth.schemas'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CreateTaskDialog from './_components/create-task-dialog.component'
import TaskKanban from './_components/task-kanban.component'
import TaskMatrix from './_components/task-matrix.component'
import TaskTable from './_components/task-table.component'
import TasksListBoard from './_components/tasks-list-board.component'
import TasksSettingsForm from './_components/tasks-settings-form.component'
import UpdateTaskDialog from './_components/update-task-dialog.component'

const SETTINGS_VIEW = 'settings' as const
type TabValue = TasksView | typeof SETTINGS_VIEW

const isTasksView = (v: string | null): v is TasksView =>
  v !== null && (TASKS_VIEWS as readonly string[]).includes(v)

const isTabValue = (v: string | null): v is TabValue => v === SETTINGS_VIEW || isTasksView(v)

export default function Tasks() {
  const { t } = useTranslation()
  const { defaultTasksView, showListTab, showKanbanTab, showTableTab, showMatrixTab } = useUserPreferencesStore()
  const [createOpen, setCreateOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const visibleViews = useMemo<TasksView[]>(() => {
    const flags: Record<TasksView, boolean> = {
      list: showListTab,
      kanban: showKanbanTab,
      table: showTableTab,
      matrix: showMatrixTab
    }
    const visible = TASKS_VIEWS.filter((v) => flags[v])
    return visible.length > 0 ? visible : [TASKS_VIEWS[0]]
  }, [showListTab, showKanbanTab, showTableTab, showMatrixTab])

  const viewParam = searchParams.get('view')
  const defaultView: TasksView = isTasksView(defaultTasksView)
    ? visibleViews.includes(defaultTasksView)
      ? defaultTasksView
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

  return (
    <div className="h-[calc(100dvh-3rem)] w-full p-6">
      <Tabs value={activeView} onValueChange={handleViewChange} className="flex h-full w-full flex-col">
        <div className="flex flex-row items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">{t('tasks.title')}</h1>
          <div className="flex items-center gap-4">
            <TabsList>
              {visibleViews.map((view) => (
                <TabsTrigger key={view} value={view}>
                  {t(`tasks.tabs.${view}`)}
                </TabsTrigger>
              ))}
              <TabsTrigger value={SETTINGS_VIEW}>{t('tasks.settings.tab_label')}</TabsTrigger>
            </TabsList>
            <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} />
          </div>
        </div>

        <TabsContent value="list" className="mt-1">
          <TasksListBoard />
        </TabsContent>

        <TabsContent value="kanban" className="mt-4 flex-1 overflow-hidden">
          <TaskKanban />
        </TabsContent>

        <TabsContent value="table" className="mt-4 flex flex-1 flex-col overflow-hidden">
          <TaskTable onCreate={() => setCreateOpen(true)} />
        </TabsContent>

        <TabsContent value="matrix" className="mt-4 flex-1 overflow-hidden">
          <TaskMatrix />
        </TabsContent>

        <TabsContent value={SETTINGS_VIEW} className="mt-4">
          <TasksSettingsForm />
        </TabsContent>
      </Tabs>

      <UpdateTaskDialog />
    </div>
  )
}
