import { useFormField } from '@/hooks/use-form-field'
import { cn, truncateText } from '@/lib/cn.lib'
import { Check, ChevronDown } from '@nsmr/pixelart-react'
import { useEffect, useRef, useState } from 'react'
import { type Control, Controller } from 'react-hook-form'
import FormField from './form-field.component'

export default function MultiSelect({
  name,
  control,
  items,
  placeholder = 'Select...',
  label,
  required,
  errorMessage,
  exclusiveValue
}: {
  name: string
  control: Control<any>
  items: {
    id: string
    label: string
  }[]
  placeholder?: string
  label?: string
  required?: boolean
  errorMessage?: string
  exclusiveValue?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { fieldId, effectivePlaceholder } = useFormField({
    placeholder,
    required,
    componentPrefix: 'multiselect'
  })

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const value: string[] = field.value || []

        const toggleItem = (id: string) => {
          if (exclusiveValue && id === exclusiveValue) {
            field.onChange([exclusiveValue])
            return
          }

          let newValue = [...value]

          if (exclusiveValue && newValue.includes(exclusiveValue)) {
            newValue = []
          }

          if (newValue.includes(id)) {
            newValue = newValue.filter((v) => v !== id)
          } else {
            newValue.push(id)
          }

          field.onChange(newValue)
        }

        const displayText =
          value.length > 0
            ? truncateText(
                value
                  .map((id) => items.find((item) => item.id === id)?.label)
                  .filter(Boolean)
                  .join(', '),
                60
              )
            : effectivePlaceholder

        return (
          <FormField label={label} required={required} errorMessage={errorMessage} htmlFor={fieldId}>
            <div className='relative w-full' ref={containerRef}>
              <button
                id={fieldId}
                type='button'
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                  'border-input dark:bg-input/30 ring-offset-background placeholder:text-muted-foreground focus:ring-ring hover:bg-accent hover:text-accent-foreground dark:hover:bg-input/50 flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-all duration-200 focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
                  value.length === 0 && required && 'text-destructive',
                  errorMessage && 'border-destructive'
                )}
                aria-invalid={!!errorMessage}
              >
                <span className={cn('block truncate', value.length === 0 && 'text-muted-foreground')}>
                  {displayText}
                </span>
                <ChevronDown className='h-4 w-4 opacity-50' />
              </button>

              {isOpen && (
                <div className='border-input bg-popover text-popover-foreground absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border shadow-md'>
                  {items.map((item) => {
                    const isSelected = value.includes(item.id)
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'relative flex cursor-pointer items-center px-2 py-1.5 text-sm transition-all duration-200 outline-none select-none',
                          isSelected
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground hover:bg-primary/10 hover:text-primary'
                        )}
                        onClick={() => toggleItem(item.id)}
                      >
                        <span className={cn('absolute left-2 flex h-3.5 w-3.5 items-center justify-center')}>
                          {isSelected ? (
                            <Check className='h-4 w-4' />
                          ) : (
                            <div className='bg-muted-foreground h-1 w-1 rounded-full' />
                          )}
                        </span>
                        <span className='ml-6'>{item.label}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </FormField>
        )
      }}
    />
  )
}
