'use client'

import LoaderButton from '@/common/loader-button.component'
import FactionColorSelector from '@/forms/faction-color-selector.component'
import SingleSelect from '@/forms/single-select.component'
import useFactionTheme, { STORAGE_KEY as FACTION_STORAGE_KEY, FACTION_TO_CLASS } from '@/hooks/use-faction-theme'
import useTheme from '@/hooks/use-theme'
import { useUserPreferencesStore, type DateFormat } from '@/stores/user-preferences.store'
import Label from '@/ui/label.component'
import Switch from '@/ui/switch.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { Faction } from '@shared/constants/factions'
import { DATE_FORMATS } from '@shared/schemas/auth.schemas'
import { useMutation } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Moon, CloudSun as Sun } from 'pixelarticons/react'
import { useEffect, useRef } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

type SettingsFormValues = {
  language: string
  defaultTasksView: string
  dateFormat: DateFormat
  theme: 'light' | 'dark'
  faction: Faction
}

function applyThemeClass(value: 'light' | 'dark') {
  const root = document.documentElement
  root.classList.remove(value === 'dark' ? 'light' : 'dark')
  root.classList.add(value)
}

function applyFactionClass(value: Faction) {
  const root = document.documentElement
  const body = document.body
  Object.values(FACTION_TO_CLASS).forEach((cls) => {
    root.classList.remove(cls)
    body.classList.remove(cls)
  })
  const cls = FACTION_TO_CLASS[value]
  if (cls) {
    root.classList.add(cls)
    body.classList.add(cls)
  }
}

function persistFactionStorage(value: Faction) {
  localStorage.setItem(FACTION_STORAGE_KEY, value)
  document.cookie = `${FACTION_STORAGE_KEY}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax; Secure`
}

function persistColorModeCookie(value: 'light' | 'dark') {
  document.cookie = `theme=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
}

function persistLocaleCookie(value: string) {
  document.cookie = `i18nextLng=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
}

export default function Settings() {
  const { t, i18n } = useTranslation()
  const { language, defaultTasksView, dateFormat, setLanguage, setDefaultTasksView, setDateFormat } =
    useUserPreferencesStore()
  const { theme, toggleTheme } = useTheme()
  const { faction } = useFactionTheme()

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty }
  } = useForm<SettingsFormValues>({
    mode: 'onChange',
    defaultValues: {
      language,
      defaultTasksView,
      dateFormat,
      theme,
      faction
    }
  })

  useEffect(() => {
    if (!isDirty) {
      reset({
        language,
        defaultTasksView,
        dateFormat,
        theme,
        faction
      })
    }
  }, [language, defaultTasksView, dateFormat, theme, faction, isDirty, reset])

  const watchedTheme = useWatch({ control, name: 'theme' })
  const watchedFaction = useWatch({ control, name: 'faction' })
  const watchedLanguage = useWatch({ control, name: 'language' })

  const savedRef = useRef({ theme, faction, language })
  useEffect(() => {
    savedRef.current = { theme, faction, language }
  }, [theme, faction, language])

  useEffect(() => {
    applyThemeClass(watchedTheme)
  }, [watchedTheme])

  useEffect(() => {
    applyFactionClass(watchedFaction)
  }, [watchedFaction])

  useEffect(() => {
    if (watchedLanguage && watchedLanguage !== i18n.language) {
      i18n.changeLanguage(watchedLanguage)
    }
  }, [watchedLanguage, i18n])

  useEffect(() => {
    return () => {
      const saved = savedRef.current
      applyThemeClass(saved.theme)
      applyFactionClass(saved.faction)
      if (i18n.language !== saved.language) {
        i18n.changeLanguage(saved.language)
      }
    }
  }, [i18n])

  const updateProfileMutation = useMutation(trpcOptions.auth.updateProfile.mutationOptions())

  const onSubmit = async (values: SettingsFormValues) => {
    try {
      const factionChanged = values.faction !== faction
      const languageChanged = values.language !== language
      const defaultTasksViewChanged = values.defaultTasksView !== defaultTasksView
      const dateFormatChanged = values.dateFormat !== dateFormat
      const themeChanged = values.theme !== theme

      const payload: Parameters<typeof updateProfileMutation.mutateAsync>[0] = {}
      if (factionChanged) payload.theme = values.faction
      if (languageChanged) payload.locale = values.language as 'en' | 'es'
      if (defaultTasksViewChanged) payload.defaultTasksView = values.defaultTasksView as 'list' | 'table' | 'matrix'
      if (dateFormatChanged) payload.dateFormat = values.dateFormat
      if (themeChanged) payload.colorMode = values.theme

      if (Object.keys(payload).length > 0) {
        await updateProfileMutation.mutateAsync(payload)
        await queryClient.invalidateQueries({ queryKey: trpcOptions.auth.getProfile.queryKey() })
      }

      if (factionChanged) persistFactionStorage(values.faction)
      if (themeChanged) persistColorModeCookie(values.theme)
      if (languageChanged) persistLocaleCookie(values.language)

      if (languageChanged) setLanguage(values.language)
      if (defaultTasksViewChanged) setDefaultTasksView(values.defaultTasksView)
      if (dateFormatChanged) setDateFormat(values.dateFormat)
      if (themeChanged) toggleTheme()

      reset(values)
      toast.success(t('settings.saved_success'))
    } catch {
      toast.error(t('settings.save_error'))
    }
  }

  const isSubmitting = updateProfileMutation.isPending
  const isSaveDisabled = !isDirty || isSubmitting

  return (
    <>
      <div className="flex max-w-md items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>
        <LoaderButton
          onClick={handleSubmit(onSubmit)}
          isLoading={isSubmitting}
          disabled={isSaveDisabled}
          variant="outline"
          className="cursor-pointer shrink-0"
          label={t('save_changes')}
        />
      </div>
      <div className="flex max-w-md flex-col gap-6 py-6">
        <Controller
          name="language"
          control={control}
          render={({ field }) => (
            <SingleSelect
              label={t('settings.language_label')}
              placeholder={t('settings.language_placeholder')}
              value={field.value}
              onChange={(v) => v && field.onChange(v)}
              options={['en', 'es'].map((value) => ({ value, label: t(`languages.${value}`) }))}
            />
          )}
        />
        <Controller
          name="defaultTasksView"
          control={control}
          render={({ field }) => (
            <SingleSelect
              label={t('settings.default_tasks_view_label')}
              placeholder={t('settings.default_tasks_view_placeholder')}
              value={field.value}
              onChange={(v) => v && field.onChange(v)}
              options={['list', 'table', 'matrix'].map((value) => ({
                value,
                label: t(`tasks.tabs.${value}`)
              }))}
            />
          )}
        />
        <Controller
          name="dateFormat"
          control={control}
          render={({ field }) => (
            <SingleSelect
              label={t('settings.date_format_label')}
              placeholder={t('settings.date_format_placeholder')}
              value={field.value}
              onChange={(v) => {
                if (v && (DATE_FORMATS as readonly string[]).includes(v)) field.onChange(v as DateFormat)
              }}
              options={DATE_FORMATS.map((value) => ({
                value,
                label: `${t(`settings.date_format_options.${value}`)} (${dayjs().format(value)})`
              }))}
            />
          )}
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor="theme">{t('settings.mode_label')}</Label>
          <Controller
            name="theme"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <Switch
                  className="peer bg-input data-[state=checked]:bg-primary h-6 w-11 cursor-pointer [&>span]:hidden"
                  checked={field.value === 'dark'}
                  onCheckedChange={(checked) => field.onChange(checked ? 'dark' : 'light')}
                />
                <div className="bg-background text-foreground pointer-events-none absolute top-0.5 left-0.5 flex h-5 w-5 items-center justify-center rounded-full shadow transition-transform peer-data-[state=checked]:translate-x-5">
                  {field.value === 'dark' ? (
                    <Moon className="fill-foreground h-3.5 w-3.5" />
                  ) : (
                    <Sun className="fill-foreground h-3.5 w-3.5" />
                  )}
                </div>
              </div>
            )}
          />
        </div>
        <Controller
          name="faction"
          control={control}
          render={({ field }) => <FactionColorSelector value={field.value} onChange={field.onChange} />}
        />
        <SourceFooter />
      </div>
    </>
  )
}

const REPO_URL = 'https://github.com/YifanYes/covenant'

function SourceFooter() {
  const { t } = useTranslation()
  const sha = process.env.NEXT_PUBLIC_COMMIT_SHA
  const href = sha ? `${REPO_URL}/tree/${sha}` : REPO_URL
  const label = sha ? t('settings.source.label_with_sha', { sha: sha.slice(0, 7) }) : t('settings.source.label')
  return (
    <div className="pt-6">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('settings.source.aria')}
        className="text-muted-foreground hover:text-foreground font-mono text-[10px]"
      >
        {label} · AGPL-3.0
      </a>
    </div>
  )
}
