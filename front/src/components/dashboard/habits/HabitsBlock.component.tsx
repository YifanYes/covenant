import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { Habit } from '@/types/models.types'
import { Checklist } from '@nsmr/pixelart-react'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Label, Pie, PieChart } from 'recharts'
import DashboardSectionWrapperComponent from '../dashboard-section-wrapper/DashboardSectionWrapper.component'

interface HabitsBlockComponentProps {
  habits: Habit[]
}

const habitConfig = {
  completed: {
    label: 'dashboard.habits.completed',
    color: 'var(--chart-2)'
  },
  remaining: {
    label: 'dashboard.habits.remaining',
    color: 'var(--muted-foreground)'
  }
} satisfies ChartConfig

export default function HabitsBlockComponent({ habits }: HabitsBlockComponentProps) {
  const { t } = useTranslation()

  const habitStats = useMemo(() => {
    const dailyHabits = habits?.filter((h) => h.timespan === 'DAILY') || []

    if (dailyHabits.length === 0) {
      return {
        completionRate: 0,
        biggestStreak: { name: t('dashboard.habits.no_habits'), days: 0 },
        chartData: []
      }
    }

    const today = dayjs().startOf('day')
    let completedToday = 0
    let maxStreak = 0
    let bestHabitName = t('dashboard.habits.none')

    dailyHabits.forEach((habit) => {
      const completions = habit.completions || []
      const todayCount = completions.filter((c: any) => dayjs(c.completedAt).isSame(today, 'day')).length
      const metToday = todayCount >= habit.recurrence

      if (metToday) completedToday++

      const sorted = [...completions].sort((a, b) => dayjs(b.completedAt).unix() - dayjs(a.completedAt).unix())
      let streak = metToday ? 1 : 0
      let checkDate = today.subtract(1, 'day')

      while (streak < 365) {
        const count = sorted.filter((c: any) => dayjs(c.completedAt).isSame(checkDate, 'day')).length
        if (count >= habit.recurrence) {
          streak++
          checkDate = checkDate.subtract(1, 'day')
        } else break
      }

      if (streak > maxStreak) {
        maxStreak = streak
        bestHabitName = habit.name
      }
    })

    const remaining = dailyHabits.length - completedToday
    const completionRate = Math.round((completedToday / dailyHabits.length) * 100)

    return {
      completionRate,
      biggestStreak: { name: bestHabitName, days: maxStreak },
      chartData: [
        { name: t(habitConfig.completed.label), value: completedToday, fill: 'var(--chart-2)' },
        { name: t(habitConfig.remaining.label), value: remaining, fill: 'var(--muted-foreground)' }
      ]
    }
  }, [habits, t])

  return (
    <DashboardSectionWrapperComponent
      title={t('sidebar.habits')}
      icon={Checklist}
      iconColorClass='text-lime-500'
      contentClassName='px-0'
      className='gap-0'
    >
      <div className='flex h-full w-full flex-col items-center justify-center gap-4'>
        {habitStats.chartData.length > 0 ? (
          <ChartContainer config={habitConfig} className='mx-auto aspect-square h-full max-h-[160px] w-full min-w-0'>
            <PieChart responsive>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={habitStats.chartData}
                dataKey='value'
                nameKey='name'
                innerRadius='80%'
                outerRadius='100%'
                cornerRadius='50%'
                paddingAngle={habitStats.chartData.every((d) => d.value > 0) ? 10 : 0}
              >
                <Label
                  content={({ viewBox }) =>
                    viewBox && 'cx' in viewBox && 'cy' in viewBox ? (
                      <text className='-mt-10' textAnchor='middle'>
                        <tspan x={viewBox.cx} y={viewBox.cy} className='fill-foreground text-xl font-bold'>
                          {habitStats.completionRate?.toLocaleString()}%
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 20} className='fill-muted-foreground text-xs'>
                          {t('dashboard.habits.completion')}
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
            <p className='text-xs'>{t('dashboard.habits.no_habits')}</p>
          </div>
        )}
      </div>
    </DashboardSectionWrapperComponent>
  )
}
