'use client'
import { useCalendarStore } from '@/stores/calendar.store'
import Button from '@/ui/button.component'
import { ChevronLeft, ChevronRight } from '@nsmr/pixelart-react'
import dayjs from 'dayjs'
import { capitalize } from 'es-toolkit/compat'
import { useTranslation } from 'react-i18next'

export default function CalendarNavbar() {
  const { t } = useTranslation()
  const { monthIndex, setMonthIndex } = useCalendarStore()

  const handlePrevMonth = () => setMonthIndex(monthIndex - 1)
  const handleNextMonth = () => setMonthIndex(monthIndex + 1)
  const handleReset = () => setMonthIndex(dayjs().month())

  const currentMonth = dayjs().month(monthIndex)
  const formattedMonthYear = capitalize(currentMonth.format('MMMM YYYY'))

  return (
    <div className='flex items-center justify-between gap-4 py-2'>
      <p className='transform-capitalize text-xl font-semibold'>{formattedMonthYear}</p>
      <div className='flex items-center gap-4'>
        <div className='flex gap-1'>
          <Button
            variant='ghost'
            size='icon'
            onClick={handlePrevMonth}
            className='hover:border-primary border-card border-2 transition-colors'
          >
            <ChevronLeft className='h-5 w-5' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            onClick={handleNextMonth}
            className='hover:border-primary border-card border-2 transition-colors'
          >
            <ChevronRight className='h-5 w-5' />
          </Button>
        </div>
        <Button
          variant='ghost'
          onClick={handleReset}
          className='hover:border-primary border-card border-2 transition-colors'
        >
          {t('calendar.today')}
        </Button>
      </div>
    </div>
  )
}
