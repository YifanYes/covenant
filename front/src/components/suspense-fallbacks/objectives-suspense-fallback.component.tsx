import Button from '@/ui/button.component'
import { useTranslation } from 'react-i18next'

export default function ObjectivesSuspenseFallback() {
  const { t } = useTranslation()

  return (
    <div className='flex max-w-3xl flex-col gap-y-12 p-6'>
      <section className='flex flex-col gap-y-6'>
        <div className='flex items-center justify-between'>
          <h2 className='text-foreground text-xl font-semibold'>{t('objectives.title')}</h2>
          <Button disabled className='bg-muted h-9 w-30 animate-pulse cursor-not-allowed px-3 py-1'></Button>
        </div>
        <div className='flex flex-col gap-4'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className='bg-muted w-full animate-pulse rounded-xl p-4'>
              <div className='bg-muted-foreground/20 mb-2 h-5 w-3/4 animate-pulse rounded' />
              <div className='bg-muted-foreground/20 mb-2 h-4 w-1/2 animate-pulse rounded' />
              <div className='flex gap-1'>
                <div className='bg-muted-foreground/20 h-6 w-16 animate-pulse rounded' />
                <div className='bg-muted-foreground/20 h-6 w-20 animate-pulse rounded' />
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className='flex flex-col gap-y-6'>
        <div className='flex items-center justify-between'>
          <div className='bg-muted h-6 w-24 animate-pulse rounded' />
          <Button disabled className='bg-muted h-9 w-30 animate-pulse cursor-not-allowed px-3 py-1'></Button>
        </div>
        <div className='flex flex-wrap gap-2'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='bg-muted h-8 w-20 animate-pulse rounded' />
          ))}
        </div>
      </section>
    </div>
  )
}
