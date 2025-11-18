import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'

export default function HabitsSuspenseFallback() {
  const { t } = useTranslation()

  return (
    <div className='min-h-screen w-full p-6'>
      <div className='flex flex-row justify-between gap-4'>
        <h1 className='text-2xl font-semibold'>{t('habits.title')}</h1>
        <Button disabled className='bg-muted h-9 w-30 animate-pulse cursor-not-allowed px-3 py-1'>
          <Plus />
        </Button>
      </div>
      <div className='flex flex-col gap-4 py-2'>
        {[1, 2, 3].map((i) => (
          <div key={i} className='bg-muted w-full animate-pulse rounded-lg border p-4'>
            <div className='bg-muted-foreground/20 mb-2 h-6 w-1/3 animate-pulse rounded' />
            <div className='bg-muted-foreground/20 mb-2 h-4 w-1/2 animate-pulse rounded' />
            <div className='bg-muted-foreground/20 h-4 w-24 animate-pulse rounded' />
          </div>
        ))}
      </div>
    </div>
  )
}
