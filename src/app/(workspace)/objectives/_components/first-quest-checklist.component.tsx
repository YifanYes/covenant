'use client'

import { cn } from '@/lib/cn.lib'
import Button from '@/ui/button.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import type { OnboardingProgress, OnboardingStepKey } from '@shared/schemas/onboarding.schemas'
import { ONBOARDING_STEP_KEYS } from '@shared/schemas/onboarding.schemas'
import { useMutation, useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Checkbox, CheckboxOn, ChevronDown, ChevronUp } from 'pixelarticons/react'
import { useTranslation } from 'react-i18next'

type StepDef = {
  key: OnboardingStepKey
  ctaHref: string | null
}

const STEPS: StepDef[] = [
  { key: 'habitCreated', ctaHref: '/habits' },
  { key: 'taskCreated', ctaHref: '/tasks' },
  { key: 'manaEarned', ctaHref: null },
  { key: 'gearEquipped', ctaHref: '/inventory' },
  { key: 'questStarted', ctaHref: '/quests' }
]

export default function FirstQuestChecklist() {
  const { t } = useTranslation()
  const { data: character } = useQuery(trpcOptions.character.getCurrentClass.queryOptions())

  const characterKey = trpcOptions.character.getCurrentClass.queryKey()
  const invalidateCharacter = () => queryClient.invalidateQueries({ queryKey: characterKey })

  const dismissMutation = useMutation(
    trpcOptions.character.dismissOnboarding.mutationOptions({ onSuccess: invalidateCharacter })
  )
  const updateMutation = useMutation(
    trpcOptions.character.updateOnboardingProgress.mutationOptions({ onError: invalidateCharacter })
  )

  if (!character) return null

  const progress: OnboardingProgress = character.onboardingProgress ?? {}
  if (progress.dismissedAt) return null

  const allDone = ONBOARDING_STEP_KEYS.every((k) => Boolean(progress[k]))
  if (allDone) return null

  const collapsed = Boolean(progress.collapsed)
  const completedCount = ONBOARDING_STEP_KEYS.filter((k) => Boolean(progress[k])).length

  const toggleCollapsed = () => {
    const next = !collapsed
    queryClient.setQueryData(characterKey, (prev) =>
      prev ? { ...prev, onboardingProgress: { ...(prev.onboardingProgress ?? {}), collapsed: next } } : prev
    )
    updateMutation.mutate({ collapsed: next })
  }

  return (
    <section
      aria-label={t('first_quest_checklist.aria')}
      className="border-foreground/20 bg-card flex flex-col gap-y-4 rounded-lg border p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-xl font-semibold">{t('first_quest_checklist.title')}</h2>
          <p className="text-muted-foreground text-sm">
            {t('first_quest_checklist.subtitle', { completed: completedCount, total: ONBOARDING_STEP_KEYS.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? t('first_quest_checklist.expand') : t('first_quest_checklist.collapse')}
          aria-expanded={!collapsed}
          className="text-muted-foreground hover:text-foreground cursor-pointer"
        >
          {collapsed ? <ChevronDown className="size-5" /> : <ChevronUp className="size-5" />}
        </button>
      </div>

      {!collapsed && (
        <>
          <ul className="flex flex-col gap-2">
            {STEPS.map((step) => {
              const done = Boolean(progress[step.key])
              const Icon = done ? CheckboxOn : Checkbox
              return (
                <li
                  key={step.key}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-md px-3 py-2',
                    done ? 'opacity-60' : 'bg-muted/40'
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Icon className={cn('size-5 shrink-0', done ? 'text-primary' : 'text-muted-foreground')} />
                    <div className="flex min-w-0 flex-col">
                      <span className={cn('text-sm font-medium', done && 'line-through')}>
                        {t(`first_quest_checklist.steps.${step.key}.title`)}
                      </span>
                      <span className="text-muted-foreground truncate text-xs">
                        {t(`first_quest_checklist.steps.${step.key}.body`)}
                      </span>
                    </div>
                  </div>
                  {!done && step.ctaHref && (
                    <Link href={step.ctaHref}>
                      <Button size="sm" variant="outline">
                        {t(`first_quest_checklist.steps.${step.key}.cta`)}
                      </Button>
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => dismissMutation.mutate()}
              className="text-muted-foreground hover:text-foreground cursor-pointer text-xs underline-offset-2 hover:underline"
            >
              {t('first_quest_checklist.skip')}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
