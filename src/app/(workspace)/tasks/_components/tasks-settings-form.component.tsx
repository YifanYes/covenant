'use client'
import LoaderButton from '@/common/loader-button.component'
import SingleSelect from '@/forms/single-select.component'
import { useUserPreferencesStore } from '@/stores/user-preferences.store'
import Label from '@/ui/label.component'
import Switch from '@/ui/switch.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { TASKS_VIEWS, type TasksView } from '@shared/schemas/auth.schemas'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { Controller, useForm, useWatch, type FieldErrors } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  tasksSettingsSchema,
  type TaskStatusDraft,
  type TasksSettingsFormValues
} from '../_schemas/tasks-settings.schemas'
import TaskStatusesSection from './task-statuses-section.component'

const TAB_FIELDS = ['showListTab', 'showKanbanTab', 'showTableTab', 'showMatrixTab'] as const
type TabField = (typeof TAB_FIELDS)[number]

const TAB_FIELD_TO_VIEW: Record<TabField, TasksView> = {
  showListTab: 'list',
  showKanbanTab: 'kanban',
  showTableTab: 'table',
  showMatrixTab: 'matrix'
}

type StatusBaseline = { publicId: string; label: string; color: string | null }

type BulkApplyPayload = {
  create: Array<{ label: string; color?: string | null }>
  update: Array<{ publicId: string; label?: string; color?: string | null }>
  delete: Array<{ publicId: string }>
}

const diffStatuses = (baseline: StatusBaseline[], current: TaskStatusDraft[]): BulkApplyPayload => {
  const baselineByPublicId = new Map(baseline.map((s) => [s.publicId, s]))
  const currentIds = new Set(current.map((s) => s.publicId))

  const create: BulkApplyPayload['create'] = current
    .filter((s) => s.isNew)
    .map((s) => ({ label: s.label, color: s.color ?? null }))

  const update: BulkApplyPayload['update'] = []
  for (const s of current) {
    if (s.isNew) continue
    const prev = baselineByPublicId.get(s.publicId)
    if (!prev) continue
    const patch: { publicId: string; label?: string; color?: string | null } = { publicId: s.publicId }
    let dirty = false
    if (prev.label !== s.label) {
      patch.label = s.label
      dirty = true
    }
    if ((prev.color ?? null) !== (s.color ?? null)) {
      patch.color = s.color
      dirty = true
    }
    if (dirty) update.push(patch)
  }

  const del = baseline.filter((s) => !currentIds.has(s.publicId)).map((s) => ({ publicId: s.publicId }))

  return { create, update, delete: del }
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

  const { data: statusesData } = useSuspenseQuery(trpcOptions.userTaskStatus.getAll.queryOptions())

  const safeDefault: TasksView = (TASKS_VIEWS as readonly string[]).includes(defaultTasksView)
    ? (defaultTasksView as TasksView)
    : 'list'

  const initialStatuses = useMemo<TaskStatusDraft[]>(
    () =>
      statusesData.statuses.map((s) => ({
        publicId: s.publicId,
        label: s.label,
        color: s.color,
        isDefault: s.isDefault
      })),
    [statusesData.statuses]
  )

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting, errors }
  } = useForm<TasksSettingsFormValues>({
    resolver: standardSchemaResolver(tasksSettingsSchema),
    mode: 'onChange',
    defaultValues: {
      defaultTasksView: safeDefault,
      showListTab,
      showKanbanTab,
      showTableTab,
      showMatrixTab,
      statuses: initialStatuses
    }
  })

  useEffect(() => {
    if (isDirty) return
    reset({
      defaultTasksView: safeDefault,
      showListTab,
      showKanbanTab,
      showTableTab,
      showMatrixTab,
      statuses: initialStatuses
    })
  }, [safeDefault, showListTab, showKanbanTab, showTableTab, showMatrixTab, initialStatuses, isDirty, reset])

  const watchedTabs = useWatch({ control, name: TAB_FIELDS }) as boolean[]
  const watchedDefault = useWatch({ control, name: 'defaultTasksView' })
  const visibleCount = watchedTabs.filter(Boolean).length

  const updateProfileMutation = useMutation(trpcOptions.auth.updateProfile.mutationOptions())
  const bulkApplyStatusesMutation = useMutation(
    trpcOptions.userTaskStatus.bulkApply.mutationOptions()
  )

  const statusesErrorMessage = errors.statuses?.message ?? errors.statuses?.root?.message
  const tabsErrorMessage = errors.showListTab?.message

  const collectFirstErrorMessage = (formErrors: FieldErrors<TasksSettingsFormValues>): string | undefined => {
    const walk = (node: unknown): string | undefined => {
      if (!node || typeof node !== 'object') return undefined
      const candidate = (node as { message?: unknown }).message
      if (typeof candidate === 'string' && candidate.length > 0) return candidate
      for (const value of Object.values(node as Record<string, unknown>)) {
        const found = walk(value)
        if (found) return found
      }
      return undefined
    }
    return walk(formErrors)
  }

  const onInvalid = (formErrors: FieldErrors<TasksSettingsFormValues>) => {
    const firstError = collectFirstErrorMessage(formErrors)
    toast.error(t('tasks.settings.save_error'), {
      description: firstError ? t(firstError, { defaultValue: firstError }) : undefined
    })
  }

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

      const diff = diffStatuses(initialStatuses, values.statuses)
      const hasStatusOps = diff.create.length > 0 || diff.update.length > 0 || diff.delete.length > 0

      if (hasStatusOps) {
        await bulkApplyStatusesMutation.mutateAsync(diff)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: trpcOptions.userTaskStatus.getAll.queryKey() }),
          queryClient.invalidateQueries({ queryKey: trpcOptions.tasks.getAll.queryKey() }),
          queryClient.invalidateQueries({ queryKey: trpcOptions.tasks.getFiltered.queryKey() }),
          queryClient.invalidateQueries({ queryKey: trpcOptions.tasks.getByDate.queryKey() }),
          queryClient.invalidateQueries({ queryKey: trpcOptions.objectives.getAll.queryKey() }),
          queryClient.invalidateQueries({ queryKey: trpcOptions.dashboard.get.queryKey() })
        ])
      }

      setPreferences({
        defaultTasksView: values.defaultTasksView,
        showListTab: values.showListTab,
        showKanbanTab: values.showKanbanTab,
        showTableTab: values.showTableTab,
        showMatrixTab: values.showMatrixTab
      })
      reset(values)
      toast.success(t('tasks.settings.saved'))
    } catch (error) {
      const raw = error instanceof Error ? error.message : undefined
      toast.error(t('tasks.settings.save_error'), {
        description: raw ? t(raw, { defaultValue: raw }) : undefined
      })
    }
  }

  const isSaveDisabled = !isDirty || isSubmitting

  return (
    <div className="w-full max-w-4xl">
      <div className="flex items-center justify-between gap-4 border-b pb-4">
        <h2 className="text-2xl font-semibold tracking-tight">{t('tasks.settings.title')}</h2>
        <div className="flex items-center gap-3">
          {isDirty && !isSubmitting && (
            <span
              role="status"
              aria-live="polite"
              className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium"
            >
              <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
              {t('tasks.settings.unsaved_changes')}
            </span>
          )}
          <LoaderButton
            onClick={handleSubmit(onSubmit, onInvalid)}
            isLoading={isSubmitting}
            disabled={isSaveDisabled}
            variant="outline"
            className="cursor-pointer shrink-0"
            label={t('tasks.settings.save')}
          />
        </div>
      </div>
      <div className="grid gap-8 py-8 lg:grid-cols-2">
        <section className="flex flex-col gap-4 lg:col-span-1">
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
          {tabsErrorMessage && (
            <p className="text-destructive text-sm" role="alert">
              {t(tabsErrorMessage, { defaultValue: tabsErrorMessage })}
            </p>
          )}
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
        <TaskStatusesSection control={control} errorMessage={statusesErrorMessage} />
      </div>
    </div>
  )
}
