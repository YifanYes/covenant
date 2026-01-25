import { Alert, BullseyeArrow, Trophy } from '@nsmr/pixelart-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import DashboardSectionWrapperComponent from '../dashboard-section-wrapper.component'
import BlindspotListComponent from './blindspot-list/blindspot-list.component'
import { getBlindspotListData } from './blindspot-list/blindspot-list.utils'

interface BlindspotComponentProps {
  areas: { name: string; lastCompletion: string | null }[]
  objectives: { name: string; lastCompletion: string | null }[]
}

export default function BlindspotComponent({ areas, objectives }: BlindspotComponentProps) {
  const { t } = useTranslation()

  const filteredAreas = useMemo(() => getBlindspotListData(areas), [areas])
  const filteredObjectives = useMemo(() => getBlindspotListData(objectives), [objectives])
  const hasAnyBlindspots = filteredAreas.length > 0 || filteredObjectives.length > 0

  return (
    <DashboardSectionWrapperComponent
      title={`${t('dashboard.blindspot.title')} (${t('dashboard.blindspot.without_activity')})`}
      icon={Alert}
      iconColorClass='text-destructive'
      className='lg:col-span-2'
      contentClassName={hasAnyBlindspots ? 'grid gap-4 sm:grid-cols-2' : 'flex items-center justify-center'}
    >
      {hasAnyBlindspots ? (
        <>
          <div className='border-border bg-card/20 flex max-h-[200px] flex-col rounded-lg border px-4 py-3'>
            <div className='text-foreground mb-2 flex shrink-0 items-center gap-2 text-sm font-bold'>
              <Trophy className='h-4 w-4' />
              {t('dashboard.blindspot.areas')}
            </div>
            <div className='scrollbar-thin scrollbar-thumb-muted h-full overflow-y-auto'>
              <BlindspotListComponent items={filteredAreas} emptyKey='dashboard.blindspot.all_areas_covered' />
            </div>
          </div>
          <div className='border-border bg-card/20 flex max-h-[200px] flex-col rounded-lg border px-4 py-3'>
            <div className='text-foreground mb-2 flex shrink-0 items-center gap-2 text-sm font-bold'>
              <BullseyeArrow className='h-4 w-4' />
              {t('dashboard.blindspot.objectives')}
            </div>
            <div className='scrollbar-thin scrollbar-thumb-muted h-full overflow-y-auto'>
              <BlindspotListComponent
                items={filteredObjectives}
                emptyKey='dashboard.blindspot.all_objectives_covered'
              />
            </div>
          </div>
        </>
      ) : (
        <div className='text-muted-foreground flex flex-col items-center justify-center gap-1 text-center text-sm italic'>
          <p>{t('dashboard.blindspot.no_blindspots_line1')}</p>
          <p>{t('dashboard.blindspot.no_blindspots_line2')}</p>
        </div>
      )}
    </DashboardSectionWrapperComponent>
  )
}
