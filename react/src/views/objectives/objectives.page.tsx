import { trpc } from '@/utils/trpc.utils'
import CreateAreaDialog from '@/views/objectives/components/areas/create-area-dialog.component'
import UpdateAreaDialog from '@/views/objectives/components/areas/update-area-dialog.component'
import CreateObjectiveDialog from '@/views/objectives/components/create-objective-dialog.component'
import ObjectiveCard from '@/views/objectives/components/objective-card.component'
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
          <h1 className='text-2xl font-semibold'>{t('areas.title')}</h1>
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
          <h1 className='text-2xl font-semibold'>{t('objectives.title')}</h1>
          <CreateObjectiveDialog />
        </div>
        <div className='3xl:grid-cols-6 grid grid-cols-1 gap-4 py-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-5'>
          {objectivesData.objectives?.map((objective) => (
            <ObjectiveCard key={objective.id} objective={objective} />
          ))}
        </div>
      </section>
    </div>
  )
}
