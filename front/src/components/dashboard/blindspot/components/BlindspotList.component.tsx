import { parseTranslationKey } from '@/utils/locale.utils'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

interface BlindspotListProps {
  items: { name: string; lastCompletion: dayjs.Dayjs | null }[]
  emptyKey: string
}

export default function BlindspotListComponent({ items, emptyKey }: BlindspotListProps) {
  const { t } = useTranslation()

  if (items.length === 0) {
    return <p className='text-muted-foreground text-xs'>{t(emptyKey)}</p>
  }

  return (
    <ul className='list-inside list-disc space-y-1 text-xs'>
      {items.map((item, i) => (
        <li key={i}>
          {parseTranslationKey(`areas.${item.name}`)}:{' '}
          {item.lastCompletion ? dayjs(item.lastCompletion).get('days') : '∞'} {t('dashboard.blindspot.days')}
        </li>
      ))}
    </ul>
  )
}
