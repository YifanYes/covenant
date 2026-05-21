'use client'
import TaskTypeBadge from '@/components/tasks/task-type-badge.component'
import { cn } from '@/lib/cn.lib'
import { areaBorderStyles, areaSimpleStyles } from '@/types/colors.types'
import { allIcons } from '@/types/icons.types'
import { type Area, type Task as TaskType } from '@/types/models.types'
import { getColorClasses } from '@/utils/theme.utils'
import dayjs from 'dayjs'
import { uniqBy } from 'es-toolkit/compat'
import { useTranslation } from 'react-i18next'

function TaskMetaBadges({ task, taskAreas }: { task: TaskType; taskAreas: Area[] }) {
  const { t } = useTranslation()

  return (
    <>
      <TaskTypeBadge effort={task.effort} impact={task.impact} />
      {taskAreas.length > 0 && (
        <div className="flex items-center gap-1">
          {taskAreas.map(({ id, name, icon, color }) => {
            const areaStyle = areaSimpleStyles.find(({ color: areaColor }) => areaColor === color)
            const currentIcon = allIcons.find(({ name: iconName }) => iconName === icon)
            return !areaStyle || !currentIcon ? null : (
              <div key={id} title={t(name)} className="flex items-center">
                <currentIcon.component className={cn('size-3.5', areaStyle.styles)} />
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

export default function Task({
  task,
  setSelectedTask,
  hideHover = false,
  variant = 'row'
}: {
  task: TaskType
  setSelectedTask?: (task?: TaskType) => void
  hideHover?: boolean
  variant?: 'row' | 'card'
}) {
  const taskAreas = uniqBy(task.objectives?.flatMap(({ areas = [] }) => areas) || [], ({ id }: Area) => id)
  const hasMeta =
    task.effort || task.impact || (task.objectives && task.objectives.length > 0) || taskAreas.length > 0
  const hasCardMeta = task.effort || task.impact || taskAreas.length > 0

  if (variant === 'card') {
    const borderColor = task.color
      ? (areaBorderStyles.find(({ color }) => color === task.color)?.styles ?? 'border-l-muted')
      : 'border-l-muted'

    return (
      <li
        onClick={() => setSelectedTask?.(task)}
        className={cn(
          'group bg-card text-card-foreground border-input flex cursor-pointer flex-col gap-3 rounded-md border border-l-4 px-3 py-4 shadow-sm transition-all',
          borderColor,
          !hideHover && 'hover:bg-gray-50/10'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-foreground min-w-0 flex-1 text-sm leading-tight font-semibold break-words">
            {task.title}
          </h3>
          {task.dueDate && (
            <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap">
              {dayjs(task.dueDate).format('DD MMM')}
            </span>
          )}
        </div>
        {hasCardMeta && (
          <div className="flex flex-wrap items-center gap-2">
            <TaskMetaBadges task={task} taskAreas={taskAreas} />
          </div>
        )}
      </li>
    )
  }

  return (
    <li
      onClick={() => setSelectedTask?.(task)}
      className={cn(
        'group border-input flex cursor-pointer items-center gap-6 border-b px-2 py-4 transition-all last:border-b-0',
        !hideHover && 'hover:rounded-md hover:border-transparent hover:bg-gray-50/10'
      )}
    >
      <div
        className={cn(
          'h-3 w-3 shrink-0 rounded-full',
          task.color ? getColorClasses(task.color, { bg: 'bg-muted', text: 'text-muted-foreground' }).bg : 'bg-muted'
        )}
      />
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-foreground text-sm font-semibold">{task.title}</h3>
          {task.dueDate && (
            <span className="text-muted-foreground text-xs whitespace-nowrap">
              {dayjs(task.dueDate).format('DD MMM')}
            </span>
          )}
        </div>
        {hasMeta && (
          <div className="flex flex-wrap items-center gap-4">
            <TaskMetaBadges task={task} taskAreas={taskAreas} />
            {task.objectives && task.objectives.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {task.objectives.map((objective) => (
                  <span
                    key={objective.id}
                    className="text-muted-foreground border-muted-foreground/30 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase"
                  >
                    {objective.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  )
}
