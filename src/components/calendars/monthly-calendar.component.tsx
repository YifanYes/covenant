'use client'
import type { Task } from '@/types/models.types'
import type { Dayjs } from 'dayjs'
import CalendarDay from './calendar-day.component'

interface MonthlyCalendarProps {
  month: Dayjs[][]
  tasks: Task[]
  moods?: Map<string, string | null>
  selectedDate?: string | null
  onSelectDate?: (date: string) => void
}

export default function MonthlyCalendar({ month, tasks, moods, selectedDate, onSelectDate }: MonthlyCalendarProps) {
  // Force 5 rows by slicing
  const limitedMonth = month.slice(0, 5)

  return (
    <div className="grid h-full flex-1 border-collapse grid-cols-7 grid-rows-5 border-2">
      {limitedMonth.map((week, weekIndex) =>
        week.map((day, dayIndex) => {
          const dateStr = day.format('YYYY-MM-DD')
          return (
            <CalendarDay
              day={day}
              key={`${weekIndex}-${dayIndex}`}
              weekIndex={weekIndex}
              tasks={tasks}
              mood={moods?.get(dateStr)}
              isSelected={selectedDate === dateStr}
              onSelect={() => onSelectDate?.(dateStr)}
            />
          )
        })
      )}
    </div>
  )
}
