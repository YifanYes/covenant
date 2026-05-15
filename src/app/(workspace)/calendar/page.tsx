'use client'

import UpdateTaskDialog from '@/app/(workspace)/tasks/_components/update-task-dialog.component'
import IntegratedCalendar from './_components/integrated-calendar.component'

export default function CalendarPage() {
  return (
    <div className="h-[calc(100dvh-3rem)] w-full p-3">
      <div className="flex h-full w-full flex-col">
        <div className="flex h-full flex-1 flex-col overflow-hidden">
          <IntegratedCalendar />
        </div>
      </div>
      <UpdateTaskDialog />
    </div>
  )
}
