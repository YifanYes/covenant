'use client'

import { useTranslation } from 'react-i18next'
import UpdateTaskDialog from '@/app/(workspace)/tasks/_components/update-task-dialog.component'
import IntegratedCalendar from './_components/integrated-calendar.component'

export default function CalendarPage() {
  const { t } = useTranslation()

  return (
    <div className="h-[calc(100dvh-3rem)] w-full p-6">
      <div className="flex h-full w-full flex-col">
        <div className="flex flex-row items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">{t('calendar.title')}</h1>
        </div>
        <div className="mt-2 flex h-full flex-1 flex-col overflow-hidden">
          <IntegratedCalendar />
        </div>
      </div>
      <UpdateTaskDialog />
    </div>
  )
}
