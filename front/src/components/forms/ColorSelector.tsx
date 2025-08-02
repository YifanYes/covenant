import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { colorOptions } from '@/types/constants.types'
import { useTranslation } from 'react-i18next'

export default function ColorSelector({
  className,
  value,
  onChange
}: {
  className?: string
  value?: string
  onChange?: (value: string) => void
}) {
  const { t } = useTranslation()

  return (
    <Select value={value ?? ''} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={t('colors.placeholder')} />
      </SelectTrigger>
      <SelectContent>
        {colorOptions.map(({ color, styles }) => (
          <SelectItem key={color} value={color}>
            <div className='flex items-center gap-2'>
              <span className={`h-4 w-4 rounded-full ${styles}`} />
              <span>{t(`colors.${color}`)}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
