import { DashboardSectionWrapper } from '@/components/dashboard/DashboardSectionWrapper'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { Task } from '@/types/models.types'
import { Zap } from '@nsmr/pixelart-react'
import { TaskStatus } from '@shared/schemas/tasks.schemas'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Label, Pie, PieChart } from 'recharts'

interface TaskStatusComponentProps {
  tasks: Task[]
}

const defaultTaskConfig = {
  TODO: {
    label: 'dashboard.task_status.TODO',
    color: 'var(--muted-foreground)'
  },
  DOING: {
    label: 'dashboard.task_status.DOING',
    color: 'var(--chart-4)'
  },
  DONE: {
    label: 'dashboard.task_status.DONE',
    color: 'var(--chart-2)'
  },
  OVERDUE: {
    label: 'dashboard.task_status.OVERDUE',
    color: 'var(--chart-1)'
  }
} satisfies ChartConfig

export function TaskStatusComponent({ tasks }: TaskStatusComponentProps) {
  const { t } = useTranslation()

  const taskStats = useMemo(() => {
    const counts = {
      TODO: 0,
      DOING: 0,
      DONE: 0,
      OVERDUE: 0
    }

    tasks.forEach((task) => {
      if (task.dueDate && dayjs(task.dueDate).isBefore(dayjs()) && task.status !== TaskStatus.DONE) {
        counts.OVERDUE++
      } else if (task.status in counts) {
        counts[task.status as keyof typeof counts]++
      }
    })

    return [
      { status: t(defaultTaskConfig.TODO.label), count: counts.TODO, fill: defaultTaskConfig.TODO.color },
      { status: t(defaultTaskConfig.DOING.label), count: counts.DOING, fill: defaultTaskConfig.DOING.color },
      { status: t(defaultTaskConfig.DONE.label), count: counts.DONE, fill: defaultTaskConfig.DONE.color },
      { status: t(defaultTaskConfig.OVERDUE.label), count: counts.OVERDUE, fill: defaultTaskConfig.OVERDUE.color }
    ].filter((item) => item.count > 0)
  }, [tasks, t])

  return (
    <DashboardSectionWrapper
      title={t('dashboard.task_status.title')}
      icon={Zap}
      iconColorClass='text-yellow-500'
      contentClassName='px-0'
      className='gap-0'
    >
      <div className='flex w-full flex-1 items-center justify-center'>
        {tasks?.length > 0 ? (
          <ChartContainer
            config={defaultTaskConfig}
            className='mx-auto aspect-square h-full max-h-[160px] w-full min-w-0'
          >
            <PieChart responsive>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={taskStats}
                dataKey='count'
                nameKey='status'
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
                          {t('dashboard.task_status.tasks')}
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
            <p className='text-xs'>{t('dashboard.task_status.no_tasks')}</p>
          </div>
        )}
      </div>
    </DashboardSectionWrapper>
  )
}
