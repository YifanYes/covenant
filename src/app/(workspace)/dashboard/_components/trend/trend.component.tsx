'use client'

import ChartContainer, { ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/ui/chart.component'
import type { TrendPoint } from '@shared/types/dashboard.types'
import dayjs from 'dayjs'
import { ArrowUp as TrendingUp } from 'pixelarticons/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import DashboardSectionWrapperComponent from '../dashboard-section-wrapper.component'

interface TrendComponentProps {
  trend: TrendPoint[]
}

export default function TrendComponent({ trend }: TrendComponentProps) {
  const { t } = useTranslation()

  const chartConfig = {
    count: {
      label: t('dashboard.trend.completions'),
      color: 'var(--chart-2)'
    }
  } satisfies ChartConfig

  const { data, total, avg, hasData } = useMemo(() => {
    const formatted = trend.map((p) => ({ ...p, label: dayjs(p.date).format('DD MMM') }))
    const sum = trend.reduce((acc, p) => acc + p.count, 0)
    return {
      data: formatted,
      total: sum,
      avg: trend.length > 0 ? (sum / trend.length).toFixed(1) : '0',
      hasData: sum > 0
    }
  }, [trend])

  return (
    <DashboardSectionWrapperComponent
      title={t('dashboard.trend.title')}
      icon={TrendingUp}
      iconColorClass="text-emerald-500"
      contentClassName="px-0"
      className="lg:col-span-2"
    >
      {hasData ? (
        <div className="flex h-full flex-col gap-2">
          <div className="text-muted-foreground flex items-center justify-between px-6 text-xs">
            <span>
              <span className="text-foreground text-base font-bold">{total}</span> {t('dashboard.trend.last_14d')}
            </span>
            <span>
              {t('dashboard.trend.daily_avg')}: <span className="text-foreground font-bold">{avg}</span>
            </span>
          </div>
          <ChartContainer config={chartConfig} className="h-full min-h-32 w-full">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--muted-foreground)" opacity={0.15} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={20}
              />
              <YAxis hide domain={[0, 'dataMax + 1']} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="count" stroke="var(--chart-2)" strokeWidth={2} fill="url(#trendFill)" />
            </AreaChart>
          </ChartContainer>
        </div>
      ) : (
        <div className="text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-2 text-center">
          <p className="text-xs">{t('dashboard.trend.no_data')}</p>
        </div>
      )}
    </DashboardSectionWrapperComponent>
  )
}
