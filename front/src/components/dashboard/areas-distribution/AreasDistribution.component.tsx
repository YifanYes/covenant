import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { Area, Task } from '@/types/models.types'
import { TrackChanges } from '@nsmr/pixelart-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart } from 'recharts'
import DashboardSectionWrapperComponent from '../dashboard-section-wrapper/DashboardSectionWrapper.component'
import { getAreasDistributionData } from './AreasDistribution.utils'
import CustomAngleTickComponent from './components/CustomAngleTick.component'

interface AreasDistributionComponentProps {
  tasks: Task[]
  areas: Area[]
}

export default function AreasDistributionComponent({ tasks, areas }: AreasDistributionComponentProps) {
  const { t } = useTranslation()
  const { data = [], config = {} } = useMemo(
    () => areas && tasks && getAreasDistributionData(areas, tasks),
    [areas, tasks]
  )

  return (
    <DashboardSectionWrapperComponent
      title={t('dashboard.areas_distribution.title')}
      icon={TrackChanges}
      iconColorClass='text-orange-500'
      className='gap-0'
    >
      {data.length > 0 ? (
        <ChartContainer config={config} className='min-h-[220px] w-full'>
          <RadarChart data={data}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarGrid stroke='var(--muted-foreground)' opacity={0.2} />
            <PolarAngleAxis dataKey='area' tick={(props) => <CustomAngleTickComponent {...props} data={data} />} />
            <PolarRadiusAxis axisLine={false} tick={false} domain={['dataMin', 'dataMax']} />
            <Radar {...config.thisMonth} />
            <Radar {...config.lastMonth} />
          </RadarChart>
        </ChartContainer>
      ) : (
        <div className='text-muted-foreground flex h-full min-h-[220px] w-full flex-col items-center justify-center gap-2 p-4 text-center'>
          <p className='text-xs'>{t('dashboard.areas_distribution.no_data')}</p>
        </div>
      )}
    </DashboardSectionWrapperComponent>
  )
}
