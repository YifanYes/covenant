import { CreateAreaDialog } from '@/components/dialogs/CreateAreaDialog'
import { CreateObjectiveDialog } from '@/components/dialogs/CreateObjectiveDialog'
import { UpdateAreaDialog } from '@/components/dialogs/UpdateAreaDialog'
import ObjectiveCard from '@/components/ObjectiveCard'
import { trpc } from '@/utils/trpc.utils'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

export const Objectives = () => {
  const { t } = useTranslation()
  const { data: objectivesData } = useSuspenseQuery(trpc.objectives.getAll.queryOptions())
  const { data: areasData } = useSuspenseQuery(trpc.areas.getAll.queryOptions())

  return (
    <div className='flex max-w-3xl flex-col gap-y-12 p-6'>
      <section className='flex flex-col gap-y-6'>
        <div className='flex items-center justify-between'>
          <h2 className='text-foreground text-xl font-semibold'>{t('objectives.title')}</h2>
          <CreateObjectiveDialog />
        </div>
        {objectivesData.objectives?.map((objective) => (
          <ObjectiveCard key={objective.id} objective={objective} />
        ))}
      </section>
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
    </div>
  )
}

export default Objectives
