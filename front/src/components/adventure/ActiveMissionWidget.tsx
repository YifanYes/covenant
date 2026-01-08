import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MissionTemplate } from '@shared/constants/missions'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import TierBadge from './TierBadge'

interface ActiveMissionWidgetProps {
  mission: {
    id: string
    name: string
    currentPhase: number
  }
  template: MissionTemplate | undefined
}

export default function ActiveMissionWidget({ mission, template }: ActiveMissionWidgetProps) {
  const { t } = useTranslation()

  if (!template) return null

  return (
    <Card className='border-primary/50 bg-primary/5'>
      <CardHeader className='pb-1'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <span className='bg-primary text-primary-foreground rounded px-2 py-0.5 text-xs font-medium'>
              {t('adventure.active_mission')}
            </span>
            <TierBadge tier={template.requiredTier} />
          </div>
        </div>
        <CardTitle className='text-base'>{t(template.name)}</CardTitle>
      </CardHeader>
      <CardContent className='pt-0'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4 text-sm'>
            <span className='text-muted-foreground'>
              {t('missions.phase')} {mission.currentPhase + 1}/{template.phases.length}
            </span>
          </div>
          <Button asChild size='sm'>
            <Link to={`/adventure/missions/${mission.name}`}>{t('missions.continue')}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
