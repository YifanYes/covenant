'use client'

import type { Habit } from '@/types/models.types'
import { invalidators } from '@/utils/query-invalidation.utils'
import { getRewardText } from '@/utils/text.utils'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { HabitTimespan } from '@shared/schemas/habits.schemas'
import { useMutation } from '@tanstack/react-query'
import type { ManipulateType, OpUnitType } from 'dayjs'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export const timespanUnits: Record<HabitTimespan, OpUnitType> = {
  [HabitTimespan.DAILY]: 'day',
  [HabitTimespan.WEEKLY]: 'week',
  [HabitTimespan.MONTHLY]: 'month'
}

export function useHabitCompletion(habit: Habit) {
  const { t } = useTranslation()
  const { completions = [], recurrence = 1, publicId, timespan, lastCompletedAt } = habit
  const timespanUnit = timespanUnits[timespan as HabitTimespan]

  const { lastCompletedLabel, isNeglected } = useMemo(() => {
    if (!lastCompletedAt) {
      return { lastCompletedLabel: t('habits.never_completed'), isNeglected: true }
    }
    const last = dayjs(lastCompletedAt)
    return {
      lastCompletedLabel: t('habits.last_completed', { relative: last.fromNow() }),
      isNeglected: last.isBefore(dayjs().subtract(1, timespanUnit as ManipulateType))
    }
  }, [lastCompletedAt, timespanUnit, t])

  const { periodCompletions, isPeriodCompleted } = useMemo(() => {
    const completionsInPeriod = completions.filter((c) => dayjs(c.completedAt).isSame(dayjs(), timespanUnit))
    return {
      periodCompletions: completionsInPeriod.length,
      isPeriodCompleted: completionsInPeriod.length >= recurrence
    }
  }, [completions, recurrence, timespanUnit])

  const createCompletion = useMutation(
    trpcOptions.habits.createCompletion.mutationOptions({
      onSuccess: async (data) => {
        const currentCount = periodCompletions + 1
        toast.success(
          t(currentCount >= recurrence ? 'habits.success.target_met' : 'habits.success.progress', {
            manaReward: getRewardText(data.manaEarned, data.reserveGained, t('combat.mana_reserve'))
          })
        )
        await queryClient.invalidateQueries({ queryKey: trpcOptions.habits.getAll.queryKey() })
        await invalidators.character()
      },
      onError: () => toast.error(t('habits.error.internal.complete'))
    })
  )

  const complete = () => createCompletion.mutate({ publicId })

  return {
    complete,
    isPending: createCompletion.isPending,
    periodCompletions,
    isPeriodCompleted,
    lastCompletedLabel,
    isNeglected,
    recurrence,
    timespanUnit
  }
}
