import { Badge } from '@/components/ui/badge.component'
import { useTranslation } from 'react-i18next'

export default function TierBadge({ tier }: { tier: number }) {
  const { t } = useTranslation()
  return (
    <Badge variant='outline' className='border-primary/50 text-primary bg-primary/10'>
      {t('store.tier')} {tier}
    </Badge>
  )
}
