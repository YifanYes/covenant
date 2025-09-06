import { cn } from '@/lib/utils'
import dayjs from 'dayjs'

export default function CalendarDay({ day, weekIndex }: { day: dayjs.Dayjs; weekIndex: number }) {
  const getCurrentDayClass = () => {
    return day.format('DD-MM-YYYY') === dayjs().format('DD-MM-YYYY')
      ? 'bg-primary text-primary-foreground rounded-full w-7'
      : ''
  }

  return (
    <div className='flex flex-col border border-gray-100'>
      <header className='flex flex-col items-center'>
        {weekIndex === 0 && <p className='mt-1 text-sm'>{day.format('ddd').toUpperCase()}</p>}
        <p className={cn('my-1 p-1 text-center text-sm', getCurrentDayClass())}>{day.format('D')}</p>
      </header>
    </div>
  )
}
