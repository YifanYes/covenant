import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { Area, Task } from '@/types/models.types'
import { parseTranslationKey } from '@/utils/locale.utils'
import { TrackChanges } from '@nsmr/pixelart-react'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, type RadarProps } from 'recharts'
import DashboardSectionWrapperComponent from '../dashboard-section-wrapper/DashboardSectionWrapper.component'
import CustomAngleTick from './components/CustomAngleTick.component'

interface AreasDistributionComponentProps {
  tasks: Task[]
  areas: Area[]
}

export default function AreasDistributionComponent({ tasks, areas }: AreasDistributionComponentProps) {
  const { t } = useTranslation()

  const areaChartData = useMemo(() => {
    if (!areas || !tasks) return { data: [], config: {} }

    const [thisM, lastM] = [dayjs(), dayjs().subtract(1, 'month')]

    const counts = tasks.reduce(
      (acc, task) => {
        if (!task.createdAt) return acc
        const d = dayjs(task.createdAt)
        const bucket = d.isSame(thisM, 'month') ? 'curr' : d.isSame(lastM, 'month') ? 'prev' : null
        if (!bucket) return acc

        task.objectives?.forEach((obj) =>
          obj.areas?.forEach((area) => {
            acc[bucket][area.id] = (acc[bucket][area.id] || 0) + 1
          })
        )
        return acc
      },
      { curr: {} as Record<string, number>, prev: {} as Record<string, number> }
    )

    const data = areas.reduce(
      (acc, a) => {
        const curr = counts.curr[a.id]
        const prev = counts.prev[a.id]

        if (!curr && !prev) return acc

        acc.push({
          name: parseTranslationKey(`areas.${a.name}`),
          iconName: a.icon,
          color: a.color,
          thisMonth: curr || 0,
          lastMonth: prev || 0
        })

        return acc
      },
      [] as { name: string; iconName: string | null; color: string | null; thisMonth: number; lastMonth: number }[]
    )

    const config: Record<string, RadarProps> & ChartConfig = {
      thisMonth: {
        name: t('dashboard.areas_distribution.this_month'),
        color: 'var(--chart-4)',
        stroke: 'var(--chart-4)',
        fill: 'var(--chart-4)',
        fillOpacity: 0.6,
        dataKey: 'thisMonth'
      },
      lastMonth: {
        name: t('dashboard.areas_distribution.last_month'),
        color: 'var(--chart-2)',
        stroke: 'var(--chart-2)',
        fill: 'var(--chart-2)',
        fillOpacity: 0.2,
        dataKey: 'lastMonth'
      }
    }

    return { data, config }
  }, [areas, tasks, t])

  return (
    <DashboardSectionWrapperComponent
      title={t('dashboard.areas_distribution.title')}
      icon={TrackChanges}
      iconColorClass='text-orange-500'
      className='gap-0'
    >
      {areaChartData.data.length > 0 ? (
        <ChartContainer config={areaChartData.config} className='min-h-[220px] w-full'>
          <RadarChart data={areaChartData.data}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarGrid stroke='var(--muted-foreground)' opacity={0.2} />
            <PolarAngleAxis dataKey='area' tick={<CustomAngleTick data={areaChartData.data} />} />
            <PolarRadiusAxis axisLine={false} tick={false} domain={['dataMin', 'dataMax']} />
            <Radar {...areaChartData.config.thisMonth} />
            <Radar {...areaChartData.config.lastMonth} />
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
