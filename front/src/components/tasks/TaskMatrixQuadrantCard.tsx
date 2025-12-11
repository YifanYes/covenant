import { cn } from '@/lib/utils'
import type { Task } from '@/types/models.types'
import { getColorClasses } from '@/utils/theme.utils'

export type Quadrant = {
  key: string
  titleKey: string
  subtitleKey: string
  bgColor: string
  textColor: string
  tasks: Task[]
}

type MatrixQuadrantCardProps = {
  quadrant: Quadrant
  t: (key: string) => string
  onTaskClick: (task: Task) => void
}

export default function TaskMatrixQuadrantCard({ quadrant, t, onTaskClick }: MatrixQuadrantCardProps) {
  return (
    <div className={`flex min-h-[200px] flex-col rounded-lg p-4 ${quadrant.bgColor} ${quadrant.textColor}`}>
      <div className='mb-2'>
        <h3 className='text-lg font-bold'>{t(quadrant.titleKey)}</h3>
        <p className='text-sm opacity-80'>{t(quadrant.subtitleKey)}</p>
      </div>
      <div className='flex flex-1 flex-col gap-1 overflow-auto'>
        {quadrant.tasks.length === 0 ? (
          <p className='text-sm italic opacity-60'>{t('tasks.matrix.no_tasks')}</p>
        ) : (
          quadrant.tasks.map((task) => {
            const colorClasses = getColorClasses(task.color, {
              bg: quadrant.bgColor,
              text: quadrant.textColor
            })
            const hasColor = Boolean(task.color && colorClasses.bg)

            return (
              <button
                key={task.id}
                onClick={() => onTaskClick(task)}
                className={cn(
                  'pointer cursor-pointer rounded-md px-2 py-1 text-left text-sm transition-colors',
                  hasColor ? [colorClasses.bg, colorClasses.text] : 'hover:bg-white/20'
                )}
              >
                {task.title}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
