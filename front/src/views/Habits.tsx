import { CreateHabitDialog } from '@/components/dialogs/CreateHabitDialog'
import { UpdateHabitDialog } from '@/components/dialogs/UpdateHabitDialog'
import { trpc } from '@/utils/trpc.utils'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

export default function Habits() {
  const { t } = useTranslation()
  const { data } = useSuspenseQuery(trpc.habits.getAll.queryOptions())

  return (
    <div className='min-h-screen w-full p-6'>
      <div className='flex flex-row justify-between gap-4'>
        <h1 className='text-2xl font-semibold'>{t('habits.title')}</h1>
        <CreateHabitDialog />
      </div>
      <div className='flex flex-col gap-4 py-2'>
        {data?.habits?.map((habit) => (
          <UpdateHabitDialog key={habit.id} habit={habit} />
        ))}
      </div>
    </div>
  )
}
