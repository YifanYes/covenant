'use client'

import { MOOD_COLOR_MAP } from '@shared/constants/journal.constants'
import JournalContent from '@/app/(workspace)/journaling/_components/journal-content.component'
import EmptyState from '@/components/empty-state.component'
import Dialog, { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.component'
import Task from '@/components/tasks/task.component'
import { useTasksStore } from '@/stores/tasks.store'
import { type Habit, type Task as TaskType } from '@/types/models.types'
import { trpcOptions } from '@/utils/trpc.utils'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { BookOpen, Check, Flag, Repeat } from 'pixelarticons/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

interface DayDetailsDialogProps {
  date: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  tasks: TaskType[]
  habits: Habit[]
}

export default function DayDetailsDialog({ date, open, onOpenChange, tasks, habits }: DayDetailsDialogProps) {
  const { t } = useTranslation()
  const { setSelectedTask } = useTasksStore()
  const timezoneOffset = new Date().getTimezoneOffset()

  const { data: entries } = useQuery(
    trpcOptions.journaling.getByDate.queryOptions(
      { date: date || '', timezoneOffset },
      { enabled: !!date }
    )
  )

  const dayTasks = useMemo(() => {
    if (!date) return []
    return tasks.filter((task) => dayjs(task.dueDate).isSame(date, 'day'))
  }, [tasks, date])

  const dayHabits = useMemo(() => {
    if (!date) return []
    return habits.filter((habit) =>
      habit.completions?.some((completion) => dayjs(completion.completedAt).isSame(date, 'day'))
    )
  }, [habits, date])

  const formattedDate = useMemo(() => {
    if (!date) return ''
    return new Date(date).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }, [date])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl capitalize">{formattedDate}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
          {/* Tasks Section */}
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {t('tasks.title')}
            </h3>
            {dayTasks.length > 0 ? (
              <ul className="rounded-md border divide-y">
                {dayTasks.map((task) => (
                  <Task key={task.id} task={task} setSelectedTask={setSelectedTask} hideHandle hideHover />
                ))}
              </ul>
            ) : (
              <EmptyState
                size="compact"
                icon={<Flag className="h-5 w-5" />}
                title={t('calendar.no_tasks_for_day')}
                description={t('calendar.no_tasks_for_day_description')}
              />
            )}
          </section>

          {/* Habits Section */}
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {t('habits.title')}
            </h3>
            {dayHabits.length > 0 ? (
              <ul className="space-y-2">
                {dayHabits.map((habit) => (
                  <li key={habit.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium">{habit.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                size="compact"
                icon={<Repeat className="h-5 w-5" />}
                title={t('calendar.no_habits_for_day')}
                description={t('calendar.no_habits_for_day_description')}
              />
            )}
          </section>

          {/* Journal Section */}
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {t('journaling.title')}
            </h3>
            {entries && entries.length > 0 ? (
              <ul className="space-y-2">
                {entries.map((entry) => (
                  <li key={entry.id} className="rounded-md border bg-background p-4 space-y-3">
                    <JournalContent html={entry.content} className="text-sm" />
                    {entry.mood && (
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: entry.color || MOOD_COLOR_MAP.get(entry.mood) }}
                        />
                        <span className="text-muted-foreground text-xs">{t(`moods.${entry.mood}`)}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                size="compact"
                icon={<BookOpen className="h-5 w-5" />}
                title={t('journaling.no_entry_for_date')}
                description={t('calendar.no_journal_for_day_description')}
              />
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
