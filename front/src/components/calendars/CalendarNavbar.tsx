import { Button } from '@/components/ui/button'
import { useCalendarStore } from '@/hooks/use-calendar-store'
import { ChevronLeft, ChevronRight } from '@nsmr/pixelart-react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

export default function CalendarNavbar() {
  const { t } = useTranslation()
  const { monthIndex, setMonthIndex } = useCalendarStore()

  const handlePrevMonth = () => setMonthIndex(monthIndex - 1)
  const handleNextMonth = () => setMonthIndex(monthIndex + 1)
  const handleReset = () => setMonthIndex(dayjs().month())

  const currentMonth = dayjs().month(monthIndex)
  const formattedMonthYear = currentMonth.format('MMMM YYYY')

  return (
    <div className='flex items-center justify-between gap-4 py-2'>
      <div className='flex items-center gap-4'>
        <p className='transform-capitalize text-xl font-semibold'>{formattedMonthYear}</p>
        <div className='flex gap-1'>
          <Button variant='ghost' size='icon' onClick={handlePrevMonth}>
            <ChevronLeft className='h-5 w-5' />
          </Button>
          <Button variant='ghost' size='icon' onClick={handleNextMonth}>
            <ChevronRight className='h-5 w-5' />
          </Button>
        </div>
      </div>
      <Button variant='outline' onClick={handleReset}>
        {t('calendar.today')}
      </Button>
    </div>
  )
}
