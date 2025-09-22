import { useCalendarStore } from '@/hooks/use-calendar-store'
import dayjs from 'dayjs'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CreateTaskDialog } from '../dialogs/CreateTaskDialog'
import { Button } from '../ui/button'

export default function CalendarSidebar() {
  const { t } = useTranslation()
  const { monthIndex, setMonthIndex } = useCalendarStore()

  const handlePrevMonth = () => setMonthIndex(monthIndex - 1)
  const handleNextMonth = () => setMonthIndex(monthIndex + 1)
  const handleReset = () => setMonthIndex(dayjs().month())

  const currentMonth = dayjs().month(monthIndex)
  const formattedMonthYear = currentMonth.format('MMMM YYYY')

  return (
    <aside className='flex flex-col gap-4 p-3'>
      <div className='flex items-center justify-between'>
        <p className='text-xl font-semibold'>{formattedMonthYear}</p>
        <div className='flex gap-1'>
          <Button variant='ghost' size='icon' onClick={handlePrevMonth}>
            <ChevronLeft className='h-5 w-5' />
          </Button>
          <Button variant='ghost' size='icon' onClick={handleNextMonth}>
            <ChevronRight className='h-5 w-5' />
          </Button>
        </div>
      </div>

      <Button variant='outline' className='w-full' onClick={handleReset}>
        {t('calendar.today')}
      </Button>

      <CreateTaskDialog />
    </aside>
  )
}
