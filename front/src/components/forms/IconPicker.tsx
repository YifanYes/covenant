import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useFormField } from '@/hooks/use-form-field'
import { cn } from '@/lib/utils'
import { allIcons, iconCategories, iconCollection, type Icon, type IconCategoryKey } from '@/types/constants.types'
import { ChevronDown, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import FormField from './FormField'

export default function IconPicker({
  value = '',
  onChange,
  placeholder,
  label,
  name,
  disabled = false,
  required = false,
  className = '',
  errorMessage
}: {
  value?: string
  onChange?: (iconName: string) => void
  placeholder?: string
  label?: string
  name?: string
  disabled?: boolean
  required?: boolean
  className?: string
  errorMessage?: string
}) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<IconCategoryKey>('all')

  const defaultPlaceholder = t('icons.placeholder')
  const { fieldId, effectivePlaceholder } = useFormField({
    placeholder: placeholder || defaultPlaceholder,
    required,
    componentPrefix: 'iconpicker'
  })

  const filteredIcons = useMemo(() => {
    let icons: Icon[] = selectedCategory === 'all' ? allIcons : iconCollection[selectedCategory] || []

    if (searchTerm) {
      icons = icons.filter((icon) => icon.name.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    return icons
  }, [selectedCategory, searchTerm])

  const currentIcon = useMemo(() => allIcons.find((icon) => icon.name === value), [value])

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
    <FormField label={label} required={required} errorMessage={errorMessage} htmlFor={fieldId}>
      <div className={cn('relative', className)}>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              id={fieldId}
              variant='outline'
              className={cn(
                'flex h-9 w-full items-center justify-between gap-2 font-normal',
                required && !value ? 'text-destructive' : ''
              )}
              disabled={disabled}
              name={name}
              aria-invalid={!!errorMessage}
            >
              <div className='flex items-center gap-2 truncate'>
                {currentIcon ? (
                  <>
                    <currentIcon.component className='h-4 w-4' />
                    <span>{currentIcon.name}</span>
                  </>
                ) : (
                  <span className={cn('text-muted-foreground', required && 'text-destructive')}>
                    {effectivePlaceholder}
                  </span>
                )}
              </div>
              <ChevronDown className='text-muted-foreground h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className='w-[300px] p-3' align='start' alignOffset={-8} sideOffset={8}>
            <div className='relative mb-3'>
              <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('icons.search_placeholder')}
                className='pl-10 text-sm'
              />
            </div>

            <div className='mb-3 flex flex-wrap gap-1.5'>
              {Object.entries(iconCategories).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key as IconCategoryKey)}
                  className={cn(
                    'rounded px-2 py-1 text-xs font-normal transition-all duration-200',
                    selectedCategory === key
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <ScrollArea className='max-h-64 overflow-visible'>
              {filteredIcons.length > 0 ? (
                <div className='grid grid-cols-6 gap-2 p-0.5'>
                  {filteredIcons.map((icon, index) => {
                    const IconComponent = icon.component
                    return (
                      <button
                        key={`${icon.name}-${index}`}
                        onClick={() => handleSelect(icon)}
                        className={cn(
                          'rounded p-2 transition-all duration-200',
                          value === icon.name
                            ? 'bg-primary/10 text-primary ring-primary/20 ring-2 hover:scale-110 hover:bg-transparent hover:ring-0'
                            : 'text-foreground hover:bg-primary/10 hover:text-primary hover:scale-110'
                        )}
                        title={icon.name}
                      >
                        <IconComponent className='mx-auto h-4 w-4' />
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className='text-muted-foreground py-8 text-center text-sm'>
                  <Search className='text-muted-foreground/50 mx-auto mb-2 h-8 w-8' />
                  <p>{t('icons.not_found')}</p>
                </div>
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
        {value && !disabled && (
          <button
            type='button'
            className='text-muted-foreground hover:text-foreground absolute top-1/2 right-9 z-10 h-4 w-4 -translate-y-1/2 cursor-pointer transition-colors'
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleClear()
            }}
          >
            <X className='h-full w-full' />
          </button>
        )}
      </div>
    </FormField>
  )
}
