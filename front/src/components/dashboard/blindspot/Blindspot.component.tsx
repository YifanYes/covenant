import { Alert, BullseyeArrow, Trophy } from '@nsmr/pixelart-react'
import { useTranslation } from 'react-i18next'
import { DashboardSectionWrapperComponent } from '../dashboard-section-wrapper.component'
import { BlindspotListComponent } from './blindspot-list/blindspot-list.component'

interface BlindspotComponentProps {
  areas: { name: string; lastCompletion: string | null }[]
  objectives: { name: string; lastCompletion: string | null }[]
}

export default function BlindspotComponent({ areas, objectives }: BlindspotComponentProps) {
  const { t } = useTranslation()

  return (
    <DashboardSectionWrapperComponent
      title={`${t('dashboard.blindspot.title')} (${t('dashboard.blindspot.without_activity')})`}
      icon={Alert}
      iconColorClass='text-destructive'
      className='lg:col-span-2'
      contentClassName='grid gap-4 sm:grid-cols-2'
    >
      <div className='border-destructive/10 bg-destructive/5 flex max-h-[200px] flex-col rounded-lg border p-4'>
        <div className='text-destructive mb-2 flex shrink-0 items-center gap-2 text-sm font-bold'>
          <Trophy className='h-4 w-4' />
          {t('dashboard.blindspot.areas')}
        </div>
        <div className='scrollbar-thin scrollbar-thumb-destructive/20 overflow-y-auto'>
          <BlindspotListComponent items={areas} emptyKey='dashboard.blindspot.all_areas_covered' />
        </div>
      </div>
      <div className='border-destructive/10 bg-destructive/5 flex max-h-[200px] flex-col rounded-lg border p-4'>
        <div className='text-destructive mb-2 flex shrink-0 items-center gap-2 text-sm font-bold'>
          <BullseyeArrow className='h-4 w-4' />
          {t('dashboard.blindspot.objectives')}
        </div>
        <div className='scrollbar-thin scrollbar-thumb-destructive/20 overflow-y-auto'>
          <BlindspotListComponent items={objectives} emptyKey='dashboard.blindspot.all_objectives_covered' />
        </div>
      </div>
    </DashboardSectionWrapperComponent>
  )
}
