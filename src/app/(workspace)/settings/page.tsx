'use client'

import ThemeToggle from '@/common/theme-toggle.component'
import FactionColorSelector from '@/forms/faction-color-selector.component'
import SingleSelect from '@/forms/single-select.component'
import { useAuthStore } from '@/stores/auth.store'
import { useTutorialStore } from '@/stores/tutorial.store'
import { useUserPreferencesStore } from '@/stores/user-preferences.store'
import Button from '@/ui/button.component'
import Input from '@/ui/input.component'
import Label from '@/ui/label.component'
import Skeleton from '@/ui/skeleton.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDeleteAccountDialog } from './_components/confirm-delete-account-dialog.component'

function CharacterNameField({
  characterName,
  onDisabledChange
}: {
  characterName: string
  onDisabledChange?: (disabled: boolean) => void
}) {
  const { t } = useTranslation()

  const [name, setName] = useState(characterName)

  const updateNameMutation = useMutation(
    trpcOptions.character.updateName.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() })
        toast.success(t('settings.character_name_updated'))
      },
      onError: () => {
        toast.error(t('settings.character_name_error'))
      }
    })
  )

  const trimmed = name.trim()
  const isUnchanged = trimmed === characterName
  const isDisabled = updateNameMutation.isPending || isUnchanged || trimmed === ''

  useEffect(() => {
    onDisabledChange?.(isDisabled)
  }, [isDisabled, onDisabledChange])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isDisabled) updateNameMutation.mutate({ name: trimmed })
  }

  return (
    <form id="character-name-form" onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Label htmlFor="character-name">{t('settings.character_name_label')}</Label>
      <Input
        id="character-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={updateNameMutation.isPending}
        maxLength={255}
      />
    </form>
  )
}

function CharacterNameFieldSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-9 w-full" />
    </div>
  )
}

function SettingsContent() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const { email, signOut } = useAuthStore()
  const { language, defaultTasksView, setDefaultTasksView, setLanguage } = useUserPreferencesStore()
  const { data: characterData } = useSuspenseQuery(trpcOptions.character.getCurrentClass.queryOptions())
  const reopen = useTutorialStore((s) => s.reopen)
  const [saveDisabled, setSaveDisabled] = useState(true)

  const handleSaveDisabledChange = useCallback((disabled: boolean) => {
    setSaveDisabled(disabled)
  }, [])

  const resetTutorialMutation = useMutation(
    trpcOptions.character.resetTutorial.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() })
        reopen()
      },
      onError: () => {
        toast.error(t('settings.replay_tutorial_error'))
      }
    })
  )

  const handleLanguageChange = (value: string | null) => {
    if (value) {
      setLanguage(value)
      i18n.changeLanguage(value)
    }
  }

  const handleDefaultViewChange = (value: string | null) => value && setDefaultTasksView(value)

  return (
    <div className="min-h-screen w-full p-6">
      <div className="flex max-w-md items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>
        <Button
          type="submit"
          form="character-name-form"
          disabled={saveDisabled}
          variant="outline"
          className="cursor-pointer shrink-0"
        >
          {t('save_changes')}
        </Button>
      </div>
      <div className="flex max-w-md flex-col gap-6 py-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{t('settings.email_label')}</Label>
          <Input id="email" type="email" value={email} disabled />
        </div>
        {characterData?.name && (
          <Suspense fallback={<CharacterNameFieldSkeleton />}>
            <CharacterNameField characterName={characterData.name} onDisabledChange={handleSaveDisabledChange} />
          </Suspense>
        )}
        <div className="flex flex-col gap-2">
          <SingleSelect
            label={t('settings.language_label')}
            placeholder={t('settings.language_placeholder')}
            value={language}
            onChange={handleLanguageChange}
            options={['en', 'es'].map((value) => ({ value, label: t(`languages.${value}`) }))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <SingleSelect
            label={t('settings.default_tasks_view_label')}
            placeholder={t('settings.default_tasks_view_placeholder')}
            value={defaultTasksView}
            onChange={handleDefaultViewChange}
            options={['list', 'table', 'matrix'].map((value) => ({
              value,
              label: t(`tasks.tabs.${value}`)
            }))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="theme">{t('settings.mode_label')}</Label>
          <ThemeToggle />
        </div>
        <div className="flex flex-col gap-2">
          <FactionColorSelector />
        </div>
        <div className="pt-4">
          <Button
            onClick={() =>
              signOut()
                .then(() => router.push('/login'))
                .catch(() => toast.error(t('settings.logout_error')))
            }
            className="w-fit text-muted-foreground border-muted-foreground hover:text-background hover:bg-muted-foreground cursor-pointer border bg-transparent"
          >
            {t('settings.logout_button')}
          </Button>
        </div>
        <div className="flex flex-col gap-4">
          <Button
            onClick={() => resetTutorialMutation.mutate()}
            disabled={resetTutorialMutation.isPending}
            className="w-fit cursor-pointer"
            variant="outline"
          >
            {t('settings.replay_tutorial')}
          </Button>
        </div>
        <div className="pt-4">
          <ConfirmDeleteAccountDialog />
        </div>
      </div>
    </div>
  )
}

export default function Settings() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  )
}
