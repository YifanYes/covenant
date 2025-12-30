import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { TrackChanges } from '@nsmr/pixelart-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart } from 'recharts'
import DashboardSectionWrapperComponent from '../dashboard-section-wrapper/DashboardSectionWrapper.component'
import type { AreasDistributionDataItem } from './AreasDistribution.model'
import { getAreasDistributionData } from './AreasDistribution.utils'
import CustomAngleTickComponent from './components/CustomAngleTick.component'

export interface AreasDistributionComponentProps {
  areas: AreasDistributionDataItem[]
}

export default function AreasDistributionComponent({ areas }: AreasDistributionComponentProps) {
  const { t } = useTranslation()
  const { localizedData, config } = useMemo(() => getAreasDistributionData(areas), [areas])

  return (
    <DashboardSectionWrapperComponent
      title={t('dashboard.areas_distribution.title')}
      icon={TrackChanges}
      iconColorClass='text-orange-500'
      className='gap-0'
    >
      {localizedData.length > 0 ? (
        <ChartContainer config={config} className='min-h-[220px] w-full'>
          <RadarChart data={localizedData}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarGrid stroke='var(--muted-foreground)' opacity={0.2} />
            <PolarAngleAxis
              dataKey='name'
              tick={(props) => <CustomAngleTickComponent {...props} data={localizedData} />}
            />
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
