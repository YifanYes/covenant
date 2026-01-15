import { Card, CardContent, CardHeader, CardTitle } from '@/ui'
import type { MissionTemplate } from '@shared/constants/missions'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { TierBadge } from './tier-badge.component'

interface MissionCardProps {
  mission: MissionTemplate
  isLocked: boolean
}

export default function MissionCard({ mission, isLocked }: MissionCardProps) {
  const { t } = useTranslation()

  const content = (
    <Card
      className={`transition-all ${
        isLocked ? 'opacity-50 grayscale' : 'hover:border-primary/50 cursor-pointer hover:shadow-md'
      }`}
    >
      <CardHeader className='pb-1'>
        <div className='flex items-start justify-between gap-2'>
          <CardTitle className='text-base'>{t(mission.name)}</CardTitle>
          <TierBadge tier={mission.requiredTier} />
        </div>
      </CardHeader>
      <CardContent className='pt-0'>
        <p className='text-muted-foreground line-clamp-2 text-sm'>{t(mission.description)}</p>
        <div className='mt-2 flex items-center gap-4 text-xs'>
          <span className='text-muted-foreground'>
            {mission.phases.length} {t('missions.phases')}
          </span>
          {mission.rewards.gold && (
            <span className='text-yellow-500'>
              +{mission.rewards.gold} {t('inventory.gold')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (isLocked) {
    return content
  }

  return <Link to={`/adventure/missions/${mission.id}`}>{content}</Link>
}
