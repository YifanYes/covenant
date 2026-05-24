'use client'

import LoaderButton from '@/common/loader-button.component'
import SingleSelect from '@/forms/single-select.component'
import { useUserPreferencesStore } from '@/stores/user-preferences.store'
import Label from '@/ui/label.component'
import Switch from '@/ui/switch.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { HABITS_VIEWS, type HabitsView } from '@shared/schemas/auth.schemas'
import { useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Controller, useForm, useWatch, type FieldErrors } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { habitsSettingsSchema, type HabitsSettingsFormValues } from '../_schemas/habits-settings.schemas'

const TAB_FIELDS = ['showTodayTab', 'showHabitsListTab', 'showGridTab', 'showHeatmapTab'] as const
type TabField = (typeof TAB_FIELDS)[number]

const TAB_FIELD_TO_VIEW: Record<TabField, HabitsView> = {
  showTodayTab: 'today',
  showHabitsListTab: 'list',
  showGridTab: 'grid',
  showHeatmapTab: 'heatmap'
}

export default function HabitsSettingsForm() {
  const { t } = useTranslation()
  const { defaultHabitsView, showTodayTab, showHabitsListTab, showGridTab, showHeatmapTab, setPreferences } =
    useUserPreferencesStore()

  const safeDefault: HabitsView = (HABITS_VIEWS as readonly string[]).includes(defaultHabitsView)
    ? (defaultHabitsView as HabitsView)
    : 'today'

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting, errors }
  } = useForm<HabitsSettingsFormValues>({
    resolver: standardSchemaResolver(habitsSettingsSchema),
    mode: 'onChange',
    defaultValues: {
      defaultHabitsView: safeDefault,
      showTodayTab,
      showHabitsListTab,
      showGridTab,
      showHeatmapTab
    }
  })

  useEffect(() => {
    if (isDirty) return
    reset({
      defaultHabitsView: safeDefault,
      showTodayTab,
      showHabitsListTab,
      showGridTab,
      showHeatmapTab
    })
  }, [safeDefault, showTodayTab, showHabitsListTab, showGridTab, showHeatmapTab, isDirty, reset])

  const watchedTabs = useWatch({ control, name: TAB_FIELDS }) as boolean[]
  const watchedDefault = useWatch({ control, name: 'defaultHabitsView' })
  const visibleCount = watchedTabs.filter(Boolean).length

  const updateProfileMutation = useMutation(trpcOptions.auth.updateProfile.mutationOptions())

  const tabsErrorMessage = errors.showTodayTab?.message

  const collectFirstErrorMessage = (formErrors: FieldErrors<HabitsSettingsFormValues>): string | undefined => {
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

  const onInvalid = (formErrors: FieldErrors<HabitsSettingsFormValues>) => {
    const firstError = collectFirstErrorMessage(formErrors)
    toast.error(t('habits.settings.save_error'), {
      description: firstError ? t(firstError, { defaultValue: firstError }) : undefined
    })
  }

  const onSubmit = async (values: HabitsSettingsFormValues) => {
    try {
      const payload: Parameters<typeof updateProfileMutation.mutateAsync>[0] = {}
      if (values.defaultHabitsView !== defaultHabitsView) payload.defaultHabitsView = values.defaultHabitsView
      const tabsChanged =
        values.showTodayTab !== showTodayTab ||
        values.showHabitsListTab !== showHabitsListTab ||
        values.showGridTab !== showGridTab ||
        values.showHeatmapTab !== showHeatmapTab
      if (tabsChanged) {
        payload.showTodayTab = values.showTodayTab
        payload.showHabitsListTab = values.showHabitsListTab
        payload.showGridTab = values.showGridTab
        payload.showHeatmapTab = values.showHeatmapTab
      }

      if (Object.keys(payload).length > 0) {
        await updateProfileMutation.mutateAsync(payload)
        await queryClient.invalidateQueries({ queryKey: trpcOptions.auth.getProfile.queryKey() })
      }

      setPreferences({
        defaultHabitsView: values.defaultHabitsView,
        showTodayTab: values.showTodayTab,
        showHabitsListTab: values.showHabitsListTab,
        showGridTab: values.showGridTab,
        showHeatmapTab: values.showHeatmapTab
      })
      reset(values)
      toast.success(t('habits.settings.saved'))
    } catch (error) {
      const raw = error instanceof Error ? error.message : undefined
      toast.error(t('habits.settings.save_error'), {
        description: raw ? t(raw, { defaultValue: raw }) : undefined
      })
    }
  }

  const isSaveDisabled = !isDirty || isSubmitting

  return (
    <div className="w-full max-w-4xl">
      <div className="flex items-center justify-between gap-4 border-b pb-4">
        <h2 className="text-2xl font-semibold tracking-tight">{t('habits.settings.title')}</h2>
        <div className="flex items-center gap-3">
          {isDirty && !isSubmitting && (
            <span
              role="status"
              aria-live="polite"
              className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium"
            >
              <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
              {t('habits.settings.unsaved_changes')}
            </span>
          )}
          <LoaderButton
            onClick={handleSubmit(onSubmit, onInvalid)}
            isLoading={isSubmitting}
            disabled={isSaveDisabled}
            variant="outline"
            className="cursor-pointer shrink-0"
            label={t('habits.settings.save')}
          />
        </div>
      </div>
      <div className="grid gap-8 py-8 lg:grid-cols-2">
        <section className="flex flex-col gap-4 lg:col-span-1">
          <h3 className="text-base font-semibold tracking-tight">{t('habits.settings.default_view_label')}</h3>
          <Controller
            name="defaultHabitsView"
            control={control}
            render={({ field }) => (
              <SingleSelect
                placeholder={t('habits.settings.default_view_placeholder')}
                value={field.value}
                onChange={(v) => v && field.onChange(v)}
                options={HABITS_VIEWS.map((value) => ({
                  value,
                  label: t(`habits.tabs.${value}`)
                }))}
              />
            )}
          />
        </section>
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold tracking-tight">{t('habits.settings.visible_tabs_label')}</h3>
            <p className="text-muted-foreground text-sm">{t('habits.settings.at_least_one_visible')}</p>
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
                        <Label htmlFor={`habits-tab-${view}`} className="cursor-pointer">
                          {t(`habits.settings.show_${view}`)}
                        </Label>
                        <Switch
                          id={`habits-tab-${view}`}
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
