import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { enUS } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'

function formatDate(date: Date | undefined) {
  if (!date) return ''
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function isValidDate(date: Date | undefined) {
  return !!date && !isNaN(date.getTime())
}

interface DatePickerProps {
  value?: Date | null
  onChange: (date: Date | null) => void
  className?: string
  placeholder?: string
}

export function DatePicker({ value, onChange, className, placeholder }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState<Date>(value || new Date())
  const [inputValue, setInputValue] = useState(formatDate(value || undefined))
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync external value changes
  useEffect(() => {
    setInputValue(formatDate(value || undefined))
    if (value) setMonth(value)
  }, [value])

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onChange(selectedDate)
      setInputValue(formatDate(selectedDate))
      setMonth(selectedDate)
    } else {
      onChange(null)
      setInputValue('')
    }
    setOpen(false)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)

    if (val === '') {
      onChange(null)
      return
    }

    const parsedDate = new Date(val)
    if (isValidDate(parsedDate)) {
      onChange(parsedDate)
      setMonth(parsedDate)
    }
  }

  const handleMonthChange = (newMonth: Date) => {
    setMonth(newMonth)
  }

  return (
    <div className={cn('relative flex gap-2', className)}>
      <Input
        ref={inputRef}
        value={inputValue}
        placeholder={placeholder || 'Select date'}
        className='bg-background pr-10'
        onChange={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
          }
        }}
      />

      <Popover open={open} onOpenChange={(state) => setOpen(state)} modal>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            className='absolute top-1/2 right-2 size-6 -translate-y-1/2'
            onClick={() => {
              // blur first to remove focus from trigger
              if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
              setTimeout(() => setOpen(true), 0)
            }}
          >
            <CalendarIcon className='size-3.5' />
            <span className='sr-only'>Select date</span>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className='w-auto overflow-hidden p-0'
          align='end'
          alignOffset={-8}
          sideOffset={10}
          onOpenAutoFocus={(e) => e.preventDefault()} // prevent focusing an element inside popover automatically
        >
          <Calendar
            mode='single'
            selected={value || undefined}
            captionLayout='dropdown'
            month={month}
            onMonthChange={handleMonthChange}
            onSelect={handleDateSelect}
            fixedWeeks
            showOutsideDays
            className='min-h-[280px]'
            startMonth={new Date(2020, 0)}
            endMonth={new Date(2050, 11)}
            locale={{
              ...enUS,
              options: { weekStartsOn: 1 }
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
