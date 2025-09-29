import { CreateAreaDialog } from '@/components/dialogs/CreateAreaDialog'
import { UpdateAreaDialog } from '@/components/dialogs/UpdateAreaDialog'
import { trpc } from '@/utils/trpc.utils'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

export const Objectives = () => {
  const { t } = useTranslation()
  const { data: areasData } = useSuspenseQuery(trpc.areas.getAll.queryOptions())

  return (
    <div className='mx-auto flex max-w-3xl flex-col gap-y-12 p-6'>
      <section className='flex flex-col gap-y-6'>
        <h2 className='text-foreground text-xl font-semibold'>{t('objectives.title')}</h2>
        <p className='text-foreground'>TO DO: add objectives</p>
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
