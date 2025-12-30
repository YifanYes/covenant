import { parseTranslationKey } from '@/utils/locale.utils'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getBlindspotListData } from './BlindspotList.utils'

interface BlindspotListProps {
  items: { name: string; lastCompletion: string | null }[]
  emptyKey: string
}

export default function BlindspotListComponent({ items, emptyKey }: BlindspotListProps) {
  const { t } = useTranslation()
  const data = useMemo(() => getBlindspotListData(items), [items])

  if (data.length === 0) {
    return <p className='text-muted-foreground text-xs'>{t(emptyKey)}</p>
  }

  return (
    <ul className='list-inside list-disc space-y-1 text-xs'>
      {data.map((item, i) => (
        <li key={i}>
          {parseTranslationKey(item.name)}: {item.lastCompletion ? dayjs(item.lastCompletion).get('days') : '∞'}{' '}
          {t('dashboard.blindspot.days')}
        </li>
      ))}
    </ul>
  )
}
