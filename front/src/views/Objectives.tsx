import AreaBadge from '@/components/AreaBadge'
import { CreateAreaDialog } from '@/components/dialogs/CreateAreaDialog'
import { trpc } from '@/utils/trpc'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

export default function Objectives() {
  const { t } = useTranslation()
  const { data: areasData, isLoading: isAreasLoading } = useQuery(trpc.areas.getAll.queryOptions())

  if (isAreasLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className='mx-auto max-w-3xl space-y-6 p-6'>
      <section className='space-y-2 p-5'>
        <h2 className='text-xl font-semibold text-gray-800'>{t('objectives.title')}</h2>
        <p className='text-gray-600'>TO DO: add objectives</p>
      </section>

      <section className='space-y-3 p-5'>
        <div className='mb-8 flex items-center justify-between'>
          <h2 className='text-xl font-semibold text-gray-800'>{t('areas.title')}</h2>
          <CreateAreaDialog />
        </div>
        <div className='flex flex-wrap gap-2'>
          {areasData?.areas?.map((area) => (
            <AreaBadge key={area.id} area={area} />
          ))}
        </div>
      </section>
    </div>
  )
}
