'use client'

import { useTutorialStore } from '@/stores/tutorial.store'
import type { TutorialSlideId } from '@shared/schemas/onboarding.schemas'
import { useEffect } from 'react'

export function useTutorialTrigger(slide: TutorialSlideId) {
  const hydrated = useTutorialStore((s) => s.hydrated)
  const enqueueIfUnseen = useTutorialStore((s) => s.enqueueIfUnseen)
  useEffect(() => {
    if (!hydrated) return
    enqueueIfUnseen(slide)
  }, [hydrated, slide, enqueueIfUnseen])
}
