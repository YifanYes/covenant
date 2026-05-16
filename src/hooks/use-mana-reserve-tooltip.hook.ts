'use client'

import { trpcOptions } from '@/utils/trpc.utils'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

const emptyBreakdown = {
  habits: { count: 0, mana: 0 },
  tasks: { count: 0, mana: 0 },
  objectives: { count: 0, mana: 0 },
  journals: { count: 0, mana: 0 },
  total: 0
}

export function useManaReserveTooltip(reserve: number) {
  const { t } = useTranslation()
  const timezoneOffset = new Date().getTimezoneOffset()
  const { data } = useQuery({
    ...trpcOptions.character.getTodayReserveBreakdown.queryOptions({ timezoneOffset }),
    enabled: reserve > 0
  })
  const breakdown = data ?? emptyBreakdown
  const sources = [
    breakdown.habits.mana > 0 ? t('combat.mana_reserve_sources.habits', { mana: breakdown.habits.mana }) : null,
    breakdown.tasks.mana > 0 ? t('combat.mana_reserve_sources.tasks', { mana: breakdown.tasks.mana }) : null,
    breakdown.objectives.mana > 0
      ? t('combat.mana_reserve_sources.objectives', { mana: breakdown.objectives.mana })
      : null,
    breakdown.journals.mana > 0 ? t('combat.mana_reserve_sources.journals', { mana: breakdown.journals.mana }) : null
  ].filter((source): source is string => Boolean(source))

  const today = sources.length
    ? t('combat.mana_reserve_today_with_sources', {
        total: breakdown.total,
        sources: sources.join(t('combat.mana_reserve_source_separator'))
      })
    : t('combat.mana_reserve_today_empty', { total: breakdown.total })

  return `${t('combat.mana_reserve_tooltip', { reserve })}\n${today}`
}
