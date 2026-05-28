'use client'
import { useFormField } from '@/hooks/use-form-field'
import { cn } from '@/lib/cn.lib'
import { Check, ChevronDown } from 'pixelarticons/react'
import { useEffect, useRef, useState } from 'react'
import { type Control, Controller, type FieldPath, type FieldValues } from 'react-hook-form'
import FormField from './form-field.component'

export default function MultiSelect<
  TFieldValues extends FieldValues = FieldValues,
  TItemId extends bigint | string = bigint
>({
  name,
  control,
  items,
  placeholder = 'Select...',
  label,
  required,
  errorMessage,
  exclusiveValue
}: {
  name: FieldPath<TFieldValues>
  control: Control<TFieldValues>
  items: {
    id: TItemId
    label: string
  }[]
  placeholder?: string
  label?: string
  required?: boolean
  errorMessage?: string
  exclusiveValue?: TItemId
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [openAbove, setOpenAbove] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

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

  // Calculate if dropdown should open above based on available space
  const calculateOpenAbove = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const dropdownHeight = Math.min(items.length * 32, 240) // max-h-60 = 240px
      setOpenAbove(spaceBelow < dropdownHeight && rect.top > dropdownHeight)
    }
  }

  const handleToggleOpen = () => {
    if (!isOpen) {
      calculateOpenAbove()
    }
    setIsOpen(!isOpen)
  }

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const value: TItemId[] = field.value || []

        const toggleItem = (id: TItemId) => {
          if (exclusiveValue != null && id === exclusiveValue) {
            field.onChange([exclusiveValue])
            return
          }

          let newValue = [...value]

          if (exclusiveValue != null && newValue.includes(exclusiveValue)) {
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
            ? value
                .map((id) => items.find((item) => item.id === id)?.label)
                .filter(Boolean)
                .join(', ')
            : effectivePlaceholder

        return (
          <FormField label={label} required={required} errorMessage={errorMessage} htmlFor={fieldId}>
            <div className="relative w-full" ref={containerRef}>
              <button
                ref={buttonRef}
                id={fieldId}
                type="button"
                onClick={handleToggleOpen}
                className={cn(
                  'border-input dark:bg-input/30 ring-offset-background placeholder:text-muted-foreground focus:ring-ring hover:bg-accent hover:text-accent-foreground dark:hover:bg-input/50 dark:hover:text-foreground flex w-full items-center gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-all duration-200 focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                  value.length === 0 && required && 'text-destructive',
                  errorMessage && 'border-destructive'
                )}
              >
                <span className={cn('w-0 flex-1 truncate text-left', value.length === 0 && 'text-muted-foreground')}>
                  {displayText}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </button>

              {isOpen && (
                <div
                  className={cn(
                    'border-input bg-popover text-popover-foreground absolute z-50 max-h-60 w-full overflow-auto rounded-md border shadow-md',
                    openAbove ? 'bottom-full mb-1' : 'top-full mt-1'
                  )}
                >
                  {items.map((item) => {
                    const isSelected = value.includes(item.id)
                    return (
                      <div
                        key={String(item.id)}
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
                            <Check className="h-4 w-4" />
                          ) : (
                            <div className="bg-muted-foreground h-1 w-1 rounded-full" />
                          )}
                        </span>
                        <span className="ml-6">{item.label}</span>
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
