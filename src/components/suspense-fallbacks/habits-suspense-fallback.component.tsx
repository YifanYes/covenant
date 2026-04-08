'use client'
import Button from '@/ui/button.component'
import { useTranslation } from 'react-i18next'

export default function HabitsSuspenseFallback() {
  const { t } = useTranslation()

  return (
    <div className='min-h-screen w-full p-6'>
      <div className='flex flex-row justify-between gap-4'>
        <h1 className='text-2xl font-semibold'>{t('habits.title')}</h1>
        <Button disabled className='bg-muted h-9 w-30 animate-pulse cursor-not-allowed px-3 py-1'></Button>
      </div>
      <div className='grid grid-cols-1 gap-4 py-2 md:grid-cols-2 lg:grid-cols-3'>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className='w-full animate-pulse rounded-lg border p-3'>
            <div className='flex items-center justify-between gap-3'>
              <div className='flex flex-1 items-center gap-2'>
                <div className='bg-muted h-8 w-8 rounded-md' />
                <div className='flex-1'>
                  <div className='bg-muted h-5 w-1/3 rounded' />
                </div>
              </div>
              <div className='bg-muted h-8 w-8 shrink-0 rounded-md' />
            </div>

            <div className='mt-4'>
              <div className='grid grid-cols-9 gap-1'>
                {Array.from({ length: 36 }).map((_, idx) => (
                  <div key={idx} className='bg-muted aspect-square rounded-sm' />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
