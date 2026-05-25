'use client'

import LoaderButton from '@/common/loader-button.component'
import { useTutorialStore } from '@/stores/tutorial.store'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { useMutation } from '@tanstack/react-query'
import { Bulletlist, Reload } from 'pixelarticons/react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface TutorialSectionProps {
  onboardingDismissed: boolean
}

export default function TutorialSection({ onboardingDismissed }: TutorialSectionProps) {
  const { t } = useTranslation()
  const replayAll = useTutorialStore((s) => s.replayAll)

  const resetTutorialMutation = useMutation(
    trpcOptions.character.resetTutorialSlides.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() })
        replayAll()
        toast.success(t('profile.tutorial.replay_success'))
      },
      onError: () => toast.error(t('settings.replay_tutorial_error'))
    })
  )

  const reopenOnboardingMutation = useMutation(
    trpcOptions.character.reopenOnboarding.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() })
        toast.success(t('profile.tutorial.reopen_success'))
      },
      onError: () => toast.error(t('user_menu.reopen_onboarding_error'))
    })
  )

  return (
    <div className="flex flex-col gap-2">
      <LoaderButton
        type="button"
        onClick={() => resetTutorialMutation.mutate()}
        isLoading={resetTutorialMutation.isPending}
        variant="outline"
        className="w-fit cursor-pointer"
        icon={<Reload />}
        label={t('settings.replay_tutorial')}
      />
      {onboardingDismissed && (
        <LoaderButton
          type="button"
          onClick={() => reopenOnboardingMutation.mutate()}
          isLoading={reopenOnboardingMutation.isPending}
          variant="outline"
          className="w-fit cursor-pointer"
          icon={<Bulletlist />}
          label={t('user_menu.reopen_onboarding')}
        />
      )}
    </div>
  )
}
