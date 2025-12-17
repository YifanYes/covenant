import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useFormField } from '@/hooks/use-form-field'
import { cn } from '@/lib/utils'
import { Calendar } from '@nsmr/pixelart-react'
import dayjs from 'dayjs'
import { capitalize } from 'es-toolkit/compat'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import FormField from './FormField'

export default function DatePicker({
  value,
  onChange,
  className,
  placeholder,
  label,
  required,
  errorMessage,
  id
}: {
  value?: Date | null
  onChange: (date: Date | null) => void
  className?: string
  placeholder?: string
  label?: string
  required?: boolean
  errorMessage?: string
  id?: string
}) {
  const { i18n } = useTranslation()
  const { fieldId, effectivePlaceholder } = useFormField({
    id,
    placeholder: placeholder || 'Select date',
    required,
    componentPrefix: 'datepicker'
  })

  const formatDate = (date: Date | undefined) => {
    if (!date) {
      return ''
    }
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const parseDate = (dateString: string): Date | null => {
    // Match DD/MM/YYYY format
    const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    const match = dateString.match(regex)

    if (!match) {
      return null
    }

    const day = parseInt(match[1], 10)
    const month = parseInt(match[2], 10) - 1 // months are 0-indexed
    const year = parseInt(match[3], 10)

    const date = new Date(year, month, day)

    // Validate the date is valid
    if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
      return null
    }

    return date
  }

  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState<Date>(value || new Date())
  const [inputValue, setInputValue] = useState(formatDate(value || undefined))
  const [cursorPosition, setCursorPosition] = useState<number | null>(null)
  const [isUserEditing, setIsUserEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleInputBlur = () => {
    if (isUserEditing) {
      setInputValue(formatDate(value || undefined))
      setIsUserEditing(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen && value) {
      setMonth(value)
    }
  }

  // Track previous value to detect external changes
  const prevValueRef = useRef<Date | null | undefined>(value)

  // Sync inputValue when value prop changes externally (e.g., when filters are cleared)
  useEffect(() => {
    if (prevValueRef.current !== value && !isUserEditing) {
      setInputValue(formatDate(value || undefined))
    }
    prevValueRef.current = value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(() => {
    if (cursorPosition !== null && inputRef.current) {
      inputRef.current.setSelectionRange(cursorPosition, cursorPosition)
    }
  }, [cursorPosition])

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
    const currentCursor = e.target.selectionStart || 0

    // Remove all non-digit characters
    const digitsOnly = val.replace(/\D/g, '')

    // Format the input as DD/MM/YYYY with dashes for missing digits
    let formatted = ''
    let newCursorPos = currentCursor

    if (digitsOnly.length === 0) {
      formatted = '--/--/----'
      newCursorPos = 0
    } else if (digitsOnly.length <= 2) {
      // Day part
      formatted = digitsOnly.padEnd(2, '-') + '/--/----'
      newCursorPos = Math.min(currentCursor, digitsOnly.length)
    } else if (digitsOnly.length <= 4) {
      // Day and month parts
      const day = digitsOnly.slice(0, 2)
      const month = digitsOnly.slice(2, 4).padEnd(2, '-')
      formatted = `${day}/${month}/----`
      // Adjust cursor for the slash after day
      if (currentCursor <= 2) {
        newCursorPos = currentCursor
      } else {
        newCursorPos = Math.min(currentCursor + 1, 3 + digitsOnly.length - 2)
      }
    } else {
      // Day, month, and year parts
      const day = digitsOnly.slice(0, 2)
      const month = digitsOnly.slice(2, 4)
      const year = digitsOnly.slice(4, 8).padEnd(4, '-')
      formatted = `${day}/${month}/${year}`
      // Adjust cursor for both slashes
      if (currentCursor <= 2) {
        newCursorPos = currentCursor
      } else if (currentCursor <= 5) {
        newCursorPos = currentCursor + 1
      } else {
        newCursorPos = Math.min(currentCursor + 2, 6 + digitsOnly.length - 4)
      }
    }

    setInputValue(formatted)
    setCursorPosition(newCursorPos)

    // Only try to parse if we have a complete date (no dashes)
    if (!formatted.includes('-')) {
      const parsedDate = parseDate(formatted)
      if (parsedDate) {
        onChange(parsedDate)
        setMonth(parsedDate)
      }
    } else if (digitsOnly.length === 0) {
      // Clear the date if input is empty
      onChange(null)
    }
  }

  return (
    <FormField label={label} required={required} errorMessage={errorMessage} htmlFor={fieldId}>
      <div className={cn('relative flex gap-2', className)}>
        <Input
          id={fieldId}
          ref={inputRef}
          value={inputValue}
          placeholder={effectivePlaceholder}
          className={cn(
            'bg-background hover:bg-accent hover:text-accent-foreground dark:hover:bg-input/50 pr-10 transition-all duration-200',
            errorMessage && 'border-destructive'
          )}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          aria-invalid={!!errorMessage}
          required={required}
        />
        <Popover open={open} onOpenChange={handleOpenChange} modal={true}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                'border-input hover:bg-primary/10 hover:text-primary hover:border-primary',
                'dark:bg-input/30 h-auto rounded-md border bg-transparent px-3 transition-all duration-200'
              )}
            >
              <Calendar className='h-4 w-4' />
            </button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-0' align='start' alignOffset={-8} sideOffset={8}>
            <CalendarComponent
              key={i18n.language}
              mode='single'
              selected={value || undefined}
              onSelect={handleDateSelect}
              month={month}
              onMonthChange={setMonth}
              weekStartsOn={1}
              initialFocus
              formatters={{
                formatCaption: (date) => {
                  const formatted = capitalize(dayjs(date).format('MMMM YYYY'))
                  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
                },
                formatWeekdayName: (date) => dayjs(date).format('dd')
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </FormField>
  )
}
