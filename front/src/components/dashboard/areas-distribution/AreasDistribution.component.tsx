import { DashboardSectionWrapper } from '@/components/dashboard/DashboardSectionWrapper'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { Area, Task } from '@/types/models.types'
import { TrackChanges } from '@nsmr/pixelart-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Label, Pie, PieChart } from 'recharts'

interface AreasDistributionComponentProps {
  tasks: Task[]
  areas: Area[]
}

export function AreasDistributionComponent({ tasks, areas }: AreasDistributionComponentProps) {
  const { t, i18n } = useTranslation()

  const areaChartData = useMemo(() => {
    if (!areas || !tasks) return { data: [], config: {} as ChartConfig }

    const areaCounts = tasks.reduce(
      (acc, task) => {
        task.objectives?.forEach((obj) => {
          obj.areas?.forEach((area: any) => {
            acc[area.id] = (acc[area.id] || 0) + 1
          })
        })
        return acc
      },
      {} as Record<string, number>
    )

    const getLabel = (name: string) => {
      if (i18n.exists(name)) return t(name)
      const namespaced = `areas.${name}`
      if (i18n.exists(namespaced)) return t(namespaced)
      return name
    }

    const data = areas
      .filter((area) => areaCounts[area.id] > 0)
      .map((area) => ({
        area: getLabel(area.name),
        tasks: areaCounts[area.id],
        fill: area.color || 'hsl(var(--muted))',
        opacity: 0.75
      }))

    const config = {
      tasks: { label: t('dashboard.areas_distribution.tasks') },
      ...Object.fromEntries(
        areas.map((area) => {
          const label = getLabel(area.name)
          return [label, { label, color: area.color || 'hsl(var(--muted))' }]
        })
      )
    }

    return { data, config }
  }, [areas, tasks, t, i18n])

  return (
    <DashboardSectionWrapper
      title={t('dashboard.areas_distribution.title')}
      icon={TrackChanges}
      iconColorClass='text-orange-500'
      contentClassName='px-0'
      className='gap-0'
    >
      <div className='flex w-full flex-1 items-center justify-center'>
        {tasks?.length > 0 ? (
          <ChartContainer
            config={areaChartData.config}
            className='mx-auto aspect-square h-full max-h-[160px] w-full min-w-0'
          >
            <PieChart responsive>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={areaChartData.data}
                dataKey='tasks'
                nameKey='area'
                innerRadius='80%'
                outerRadius='100%'
                cornerRadius='50%'
                paddingAngle={10}
              >
                <Label
                  content={({ viewBox }) =>
                    viewBox && 'cx' in viewBox && 'cy' in viewBox ? (
                      <text className='-mt-10' textAnchor='middle'>
                        <tspan x={viewBox.cx} y={viewBox.cy} className='fill-foreground text-xl font-bold'>
                          {tasks?.length?.toLocaleString()}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 20} className='fill-muted-foreground text-xs'>
                          {t('dashboard.areas_distribution.tasks')}
                        </tspan>
                      </text>
                    ) : null
                  }
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        ) : (
          <div className='text-muted-foreground flex flex-col items-center gap-2 text-center'>
            <span className='text-2xl'>📊</span>
            <p className='text-xs'>{t('dashboard.areas_distribution.no_data')}</p>
          </div>
        )}
      </div>
    </DashboardSectionWrapper>
  )
}
