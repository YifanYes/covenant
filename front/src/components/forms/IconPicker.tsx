import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { allIcons, iconCategories, iconCollection, type Icon, type IconCategoryKey } from '@/types/constants.types'
import { ChevronDown, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface IconPickerProps {
  value?: string
  onChange?: (iconName: string) => void
  placeholder?: string
  label?: string
  name?: string
  disabled?: boolean
  required?: boolean
  className?: string
}

export default function IconPicker({
  value = '',
  onChange,
  placeholder = 'Select an icon',
  label,
  name,
  disabled = false,
  required = false,
  className = ''
}: IconPickerProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<IconCategoryKey>('all')

  const filteredIcons = useMemo(() => {
    let icons: Icon[] = selectedCategory === 'all' ? allIcons : iconCollection[selectedCategory] || []

    if (searchTerm) {
      icons = icons.filter((icon) => icon.name.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    return icons
  }, [selectedCategory, searchTerm])

  const currentIcon = useMemo(() => {
    return Object.values(iconCollection)
      .flat()
      .find((icon) => icon.name === value)
  }, [value])

  const handleSelect = (icon: Icon) => {
    onChange?.(icon.name)
    setSearchTerm('')
    setSelectedCategory('all')
    setIsOpen(false)
  }

  const handleClear = () => {
    onChange?.('')
  }

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className='mb-1 block text-sm font-medium text-gray-700'>
          {label}
          {required && <span className='ml-1 text-red-500'>*</span>}
        </label>
      )}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant='outline'
            className='flex w-full items-center justify-between gap-2'
            disabled={disabled}
            name={name}
          >
            <div className='flex items-center gap-2 truncate'>
              {currentIcon ? (
                <>
                  <currentIcon.component className='h-4 w-4 text-gray-600' />
                  <span>{currentIcon.name}</span>
                </>
              ) : (
                <span className='text-gray-500'>{placeholder}</span>
              )}
            </div>
            <div className='flex items-center gap-1'>
              {value && !disabled && (
                <X
                  className='h-3 w-3 cursor-pointer text-gray-400 hover:text-gray-600'
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClear()
                  }}
                />
              )}
              <ChevronDown className='h-4 w-4 text-gray-400' />
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className='w-[300px] p-3'>
          <div className='relative mb-3'>
            <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400' />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder='Search icons...'
              className='pl-10 text-sm'
            />
          </div>

          <div className='mb-3 flex flex-wrap gap-1'>
            {Object.entries(iconCategories).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key as IconCategoryKey)}
                className={cn(
                  'rounded px-2 py-1 text-xs font-medium transition-colors',
                  selectedCategory === key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <ScrollArea className='max-h-64'>
            {filteredIcons.length > 0 ? (
              <div className='grid grid-cols-6 gap-2'>
                {filteredIcons.map((icon, index) => {
                  const IconComponent = icon.component
                  return (
                    <button
                      key={`${icon.name}-${index}`}
                      onClick={() => handleSelect(icon)}
                      className={cn(
                        'rounded p-2 hover:bg-gray-100',
                        value === icon.name ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
                      )}
                      title={icon.name}
                    >
                      <IconComponent className='mx-auto h-4 w-4' />
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className='py-8 text-center text-sm text-gray-500'>
                <Search className='mx-auto mb-2 h-8 w-8 text-gray-300' />
                <p>{t('icons.not_found')}</p>
              </div>
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
