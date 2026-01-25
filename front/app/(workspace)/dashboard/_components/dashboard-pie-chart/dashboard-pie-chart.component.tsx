'use client'
import ChartContainer, { ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/ui/chart.component'
import { parseTranslationKey } from '@/utils/locale.utils'
import { useMemo } from 'react'
import { Label, Pie, PieChart, type PieProps } from 'recharts'
import { parseDashboardPieChartConfig } from './dashboard-pie-chart.utils'

interface DashboardPieChartComponentProps {
  data: PieProps['data']
  collectionLength: number
  config: ChartConfig
  labelValue: string
  chartLabel: string
  emptyLabel: string
}

export default function DashboardPieChartComponent({
  data,
  collectionLength,
  config,
  labelValue,
  chartLabel,
  emptyLabel
}: DashboardPieChartComponentProps) {
  const parsedData = useMemo(() => parseDashboardPieChartConfig(data), [data])

  return (
    <div className='flex w-full flex-1 items-center justify-center'>
      {collectionLength > 0 ? (
        <ChartContainer config={config} className='mx-auto aspect-square h-full max-h-[160px] w-full min-w-0'>
          <PieChart responsive>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={parsedData}
              dataKey='data'
              nameKey='name'
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
                        {parseTranslationKey(labelValue)}
                      </tspan>
                      <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 20} className='fill-muted-foreground text-xs'>
                        {parseTranslationKey(chartLabel)}
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
          <p className='text-xs'>{parseTranslationKey(emptyLabel)}</p>
        </div>
      )}
    </div>
  )
}
