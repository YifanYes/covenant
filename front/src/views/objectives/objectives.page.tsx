import { trpc } from '@/utils/trpc.utils'
import { CreateObjectiveDialog, ObjectiveCard } from '@/views/objectives/components'
import { CreateAreaDialog, UpdateAreaDialog } from '@/views/objectives/components/areas'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

export default function Objectives() {
  const { t } = useTranslation()
  const { data: objectivesData } = useSuspenseQuery(trpc.objectives.getAll.queryOptions())
  const { data: areasData } = useSuspenseQuery(trpc.areas.getAll.queryOptions())

  return (
    <div className='flex w-full flex-col gap-y-16 p-6'>
      <section className='flex flex-col gap-y-6'>
        <div className='flex items-center justify-between'>
          <h2 className='text-foreground text-xl font-semibold'>{t('areas.title')}</h2>
          <CreateAreaDialog />
        </div>
        <div className='flex flex-wrap gap-2'>
          {areasData.areas.map((area) => (
            <UpdateAreaDialog key={area.id} area={area} />
          ))}
        </div>
      </section>
      <section className='flex flex-col gap-y-6'>
        <div className='flex items-center justify-between'>
          <h2 className='text-foreground text-xl font-semibold'>{t('objectives.title')}</h2>
          <CreateObjectiveDialog />
        </div>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {objectivesData.objectives?.map((objective) => (
            <ObjectiveCard key={objective.id} objective={objective} />
          ))}
        </div>
      </section>
    </div>
  )
}
