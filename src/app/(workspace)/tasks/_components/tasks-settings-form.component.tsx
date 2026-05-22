'use client'
import LoaderButton from '@/common/loader-button.component'
import SingleSelect from '@/forms/single-select.component'
import { useUserPreferencesStore } from '@/stores/user-preferences.store'
import Label from '@/ui/label.component'
import Switch from '@/ui/switch.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { TASKS_VIEWS, type TasksView } from '@shared/schemas/auth.schemas'
import { useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { tasksSettingsSchema, type TasksSettingsFormValues } from '../_schemas/tasks-settings.schemas'

const TAB_FIELDS = ['showListTab', 'showKanbanTab', 'showTableTab', 'showMatrixTab'] as const
type TabField = (typeof TAB_FIELDS)[number]

const TAB_FIELD_TO_VIEW: Record<TabField, TasksView> = {
  showListTab: 'list',
  showKanbanTab: 'kanban',
  showTableTab: 'table',
  showMatrixTab: 'matrix'
}

export default function TasksSettingsForm() {
  const { t } = useTranslation()
  const {
    defaultTasksView,
    showListTab,
    showKanbanTab,
    showTableTab,
    showMatrixTab,
    setPreferences
  } = useUserPreferencesStore()

  const safeDefault: TasksView = (TASKS_VIEWS as readonly string[]).includes(defaultTasksView)
    ? (defaultTasksView as TasksView)
    : 'list'

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isValid }
  } = useForm<TasksSettingsFormValues>({
    resolver: standardSchemaResolver(tasksSettingsSchema),
    mode: 'onChange',
    defaultValues: {
      defaultTasksView: safeDefault,
      showListTab,
      showKanbanTab,
      showTableTab,
      showMatrixTab
    }
  })

  useEffect(() => {
    if (isDirty) return
    reset({
      defaultTasksView: safeDefault,
      showListTab,
      showKanbanTab,
      showTableTab,
      showMatrixTab
    })
  }, [safeDefault, showListTab, showKanbanTab, showTableTab, showMatrixTab, isDirty, reset])

  const watchedTabs = useWatch({ control, name: TAB_FIELDS }) as boolean[]
  const watchedDefault = useWatch({ control, name: 'defaultTasksView' })
  const visibleCount = watchedTabs.filter(Boolean).length

  const updateProfileMutation = useMutation(trpcOptions.auth.updateProfile.mutationOptions())

  const onSubmit = async (values: TasksSettingsFormValues) => {
    try {
      const payload: Parameters<typeof updateProfileMutation.mutateAsync>[0] = {}
      if (values.defaultTasksView !== defaultTasksView) payload.defaultTasksView = values.defaultTasksView
      const tabsChanged =
        values.showListTab !== showListTab ||
        values.showKanbanTab !== showKanbanTab ||
        values.showTableTab !== showTableTab ||
        values.showMatrixTab !== showMatrixTab
      if (tabsChanged) {
        payload.showListTab = values.showListTab
        payload.showKanbanTab = values.showKanbanTab
        payload.showTableTab = values.showTableTab
        payload.showMatrixTab = values.showMatrixTab
      }

      if (Object.keys(payload).length > 0) {
        await updateProfileMutation.mutateAsync(payload)
        await queryClient.invalidateQueries({ queryKey: trpcOptions.auth.getProfile.queryKey() })
      }

      setPreferences(values)
      reset(values)
      toast.success(t('tasks.settings.saved'))
    } catch {
      toast.error(t('tasks.settings.save_error'))
    }
  }

  const isSubmitting = updateProfileMutation.isPending
  const isSaveDisabled = !isDirty || !isValid || isSubmitting

  return (
    <div className="w-full max-w-4xl">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-2xl font-semibold tracking-tight">{t('tasks.settings.title')}</h2>
        <LoaderButton
          onClick={handleSubmit(onSubmit)}
          isLoading={isSubmitting}
          disabled={isSaveDisabled}
          variant="outline"
          className="cursor-pointer shrink-0"
          label={t('tasks.settings.save')}
        />
      </div>
      <div className="grid gap-8 py-8 lg:grid-cols-2">
        <section className="flex flex-col gap-4">
          <h3 className="text-base font-semibold tracking-tight">{t('tasks.settings.default_view_label')}</h3>
          <Controller
            name="defaultTasksView"
            control={control}
            render={({ field }) => (
              <SingleSelect
                placeholder={t('tasks.settings.default_view_placeholder')}
                value={field.value}
                onChange={(v) => v && field.onChange(v)}
                options={TASKS_VIEWS.map((value) => ({
                  value,
                  label: t(`tasks.tabs.${value}`)
                }))}
              />
            )}
          />
        </section>
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold tracking-tight">{t('tasks.settings.visible_tabs_label')}</h3>
            <p className="text-muted-foreground text-sm">{t('tasks.settings.at_least_one_visible')}</p>
          </div>
          <div className="flex flex-col divide-y rounded-md border">
            {TAB_FIELDS.map((field) => {
              const view = TAB_FIELD_TO_VIEW[field]
              return (
                <Controller
                  key={field}
                  name={field}
                  control={control}
                  render={({ field: rhf }) => {
                    const isLastVisible = rhf.value && visibleCount === 1
                    const isCurrentDefault = view === watchedDefault
                    return (
                      <div className="flex items-center justify-between px-4 py-3">
                        <Label htmlFor={`tab-${view}`} className="cursor-pointer">
                          {t(`tasks.settings.show_${view}`)}
                        </Label>
                        <Switch
                          id={`tab-${view}`}
                          checked={rhf.value}
                          onCheckedChange={rhf.onChange}
                          disabled={isLastVisible || isCurrentDefault}
                        />
                      </div>
                    )
                  }}
                />
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
