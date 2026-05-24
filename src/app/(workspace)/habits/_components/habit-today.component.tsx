'use client'

import EmptyState from '@/components/empty-state.component'
import { timespanUnits } from '@/hooks/use-habit-completion'
import type { Habit } from '@/types/models.types'
import Button from '@/ui/button.component'
import { trpcOptions } from '@/utils/trpc.utils'
import { HabitTimespan } from '@shared/schemas/habits.schemas'
import { useSuspenseQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { CheckDouble, ChevronDown, ChevronRight } from 'pixelarticons/react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import HabitRow from './habit-row.component'

const SECTION_ORDER: HabitTimespan[] = [HabitTimespan.DAILY, HabitTimespan.WEEKLY, HabitTimespan.MONTHLY]

const sectionLabelKey: Record<HabitTimespan, string> = {
  [HabitTimespan.DAILY]: 'habits.today.section_daily',
  [HabitTimespan.WEEKLY]: 'habits.today.section_weekly',
  [HabitTimespan.MONTHLY]: 'habits.today.section_monthly'
}

const isComplete = (habit: Habit) => {
  const unit = timespanUnits[habit.timespan as HabitTimespan]
  const count = (habit.completions ?? []).filter((c) => dayjs(c.completedAt).isSame(dayjs(), unit)).length
  return count >= (habit.recurrence ?? 1)
}

export default function HabitToday() {
  const { t } = useTranslation()
  const { data } = useSuspenseQuery(trpcOptions.habits.getAll.queryOptions())
  const habits = data?.habits
  const [doneOpen, setDoneOpen] = useState(false)

  const { sections, doneHabits } = useMemo(() => {
    const sections: Record<HabitTimespan, Habit[]> = {
      [HabitTimespan.DAILY]: [],
      [HabitTimespan.WEEKLY]: [],
      [HabitTimespan.MONTHLY]: []
    }

    const done: Habit[] = []

    for (const habit of habits ?? []) {
      const ts = habit.timespan as HabitTimespan
      if (!(ts in sections)) continue

      if (isComplete(habit)) {
        done.push(habit)
      } else {
        sections[ts].push(habit)
      }
    }
    return { sections, doneHabits: done }
  }, [habits])

  const activeCount = sections.DAILY.length + sections.WEEKLY.length + sections.MONTHLY.length

  if (!habits || habits.length === 0) return null

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto">
      {activeCount === 0 ? (
        <EmptyState
          size="default"
          icon={<CheckDouble className="h-8 w-8" />}
          title={t('habits.today.all_done_title')}
          description={t('habits.today.all_done')}
        />
      ) : (
        SECTION_ORDER.map((ts) => {
          const sectionHabits = sections[ts]
          if (sectionHabits.length === 0) return null
          return (
            <section key={ts} className="flex flex-col gap-2">
              <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                {t(sectionLabelKey[ts] as Parameters<typeof t>[0])}
              </h2>
              <div className="overflow-hidden rounded-md border">
                {sectionHabits.map((habit) => (
                  <HabitRow key={habit.id} habit={habit} />
                ))}
              </div>
            </section>
          )
        })
      )}

      {doneHabits.length > 0 && (
        <section className="flex flex-col gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDoneOpen((v) => !v)}
            className="text-muted-foreground hover:text-foreground h-auto w-fit gap-1 p-2 text-xs font-semibold uppercase tracking-wide hover:bg-transparent"
          >
            {doneOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {t('habits.today.done_section', { count: doneHabits.length })}
          </Button>
          {doneOpen && (
            <div className="overflow-hidden rounded-md border opacity-70">
              {doneHabits.map((habit) => (
                <HabitRow key={habit.id} habit={habit} showTimespanBadge />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
