'use client'

import CharacterNameForm from '@/components/profile/character-name-form.component'
import ChangePasswordForm from '@/components/profile/change-password-form.component'
import DangerZone from '@/components/profile/danger-zone.component'
import EmailSection from '@/components/profile/email-section.component'
import TutorialSection from '@/components/profile/tutorial-section.component'
import { trpcOptions } from '@/utils/trpc.utils'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

export default function ProfilePage() {
  const { t } = useTranslation()
  const profileQuery = useQuery(trpcOptions.auth.getProfile.queryOptions())
  const { data: character } = useQuery(trpcOptions.character.getCurrentClass.queryOptions())
  const { data: profile, isPending, isError } = profileQuery

  if (isPending) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-8 py-6">
        <div className="bg-muted/40 h-7 w-32 animate-pulse rounded" />
        <div className="grid gap-x-12 gap-y-8 lg:grid-cols-2">
          <div className="bg-muted/40 h-64 animate-pulse rounded" />
          <div className="bg-muted/40 h-64 animate-pulse rounded" />
        </div>
      </div>
    )
  }

  if (isError || !profile) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-4 py-6">
        <h1 className="text-2xl font-semibold">{t('profile.title')}</h1>
        <p className="text-destructive text-sm">{t('profile.load_error')}</p>
      </div>
    )
  }

  const onboardingDismissed = Boolean(character?.onboardingProgress?.dismissedAt)

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 py-6">
      <h1 className="text-2xl font-semibold">{t('profile.title')}</h1>

      <div className="grid gap-x-12 gap-y-8 lg:grid-cols-2">
        <div className="flex flex-col gap-8">
          {character?.name && (
            <section className="flex flex-col gap-3">
              <h2 className="font-title text-lg">{t('profile.character.title')}</h2>
              <CharacterNameForm initialName={character.name} />
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="font-title text-lg">{t('profile.email.title')}</h2>
            <EmailSection email={profile.email} emailVerified={profile.emailVerified} />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-title text-lg">{t('profile.password.title')}</h2>
            <ChangePasswordForm />
          </section>
        </div>

        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h2 className="font-title text-lg">{t('profile.tutorial.title')}</h2>
            <TutorialSection onboardingDismissed={onboardingDismissed} />
          </section>

          <DangerZone />
        </div>
      </div>
    </div>
  )
}
