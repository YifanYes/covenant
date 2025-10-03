import { cn, truncateText } from '@/lib/utils'
import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { type Control, Controller } from 'react-hook-form'

type MultiSelectItem = {
  id: string
  label: string
}

type MultiSelectProps = {
  name: string
  control: Control<any>
  items: MultiSelectItem[]
  placeholder?: string
}

export default function MultiSelect({ name, control, items, placeholder = 'Select...' }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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
          if (value.includes(id)) {
            field.onChange(value.filter((v) => v !== id))
          } else {
            field.onChange([...value, id])
          }
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
            : placeholder

        return (
          <div className='relative w-full' ref={containerRef}>
            <button
              type='button'
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                'border-input flex h-9 w-full items-center gap-2 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm',
                'dark:bg-input/30',
                'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              <span className='min-w-0 flex-1 truncate overflow-hidden text-left'>{displayText}</span>
              <span className='flex-shrink-0'>
                <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
              </span>
            </button>

            {isOpen && (
              <div className='border-border bg-popover absolute z-50 mt-1 w-full rounded-md border shadow-md'>
                <div className='max-h-60 overflow-y-auto p-1'>
                  {items.map((item) => {
                    const isSelected = value.includes(item.id)
                    return (
                      <label
                        key={item.id}
                        className='hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-2 rounded px-2 py-2'
                      >
                        <input
                          type='checkbox'
                          className='border-input accent-primary focus:ring-ring h-4 w-4 rounded'
                          checked={isSelected}
                          onChange={() => toggleItem(item.id)}
                        />
                        <span className='flex-1 text-sm'>{item.label}</span>
                        {isSelected && <Check className='text-primary h-4 w-4' />}
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      }}
    />
  )
}
