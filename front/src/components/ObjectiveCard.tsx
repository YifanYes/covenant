import type { Objective } from '@/types/models.types'
import { format } from 'date-fns'
import AreaBadge from './AreaBadge'

export default function ObjectiveCard({ objective }: { objective: Objective }) {
  return (
    <div className='w-full rounded-xl p-4 shadow-sm transition-shadow hover:shadow-md'>
      <div className='pb-2'>
        <h4 className='text-base leading-tight font-semibold'>{objective.name}</h4>
      </div>
      <div className='space-y-0.5 py-0 pb-2'>
        {objective.description && (
          <p className='text-muted-foreground truncate text-sm leading-snug'>{objective.description}</p>
        )}
        {objective.dueDate && (
          <div className='text-muted-foreground text-xs'>{format(new Date(objective.dueDate), 'PPP')}</div>
        )}
      </div>
      <div className='flex flex-wrap gap-1 pt-0'>
        {objective.areas?.map((area) => (
          <AreaBadge key={area.id} area={area} />
        ))}
      </div>
    </div>
  )
}
