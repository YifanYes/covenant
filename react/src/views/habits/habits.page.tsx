import { trpc } from '@/utils/trpc.utils'
import CreateHabitDialog from '@/views/habits/components/create-habit-dialog.component'
import UpdateHabitDialog from '@/views/habits/components/update-habit-dialog.component'
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
      {data?.habits?.length === 0 ? (
        <div className='flex min-h-[200px] items-center justify-center'>
          <p className='text-muted-foreground text-sm italic'>{t('habits.empty')}</p>
        </div>
      ) : (
        <div className='3xl:grid-cols-6 grid grid-cols-1 gap-4 py-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-5'>
          {data?.habits?.map((habit) => (
            <UpdateHabitDialog key={habit.id} habit={habit} />
          ))}
        </div>
      )}
    </div>
  )
}
