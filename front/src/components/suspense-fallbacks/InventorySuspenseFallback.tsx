import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from 'react-i18next'

export default function InventorySuspenseFallback() {
  const { t } = useTranslation()

  return (
    <div className='flex h-full w-full flex-col gap-6 p-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold'>{t('inventory.title')}</h1>
      </div>

      <div className='grid grid-cols-1 gap-6 md:grid-cols-[350px_1fr]'>
        {/* Left Column Skeleton */}
        <div className='bg-card flex flex-col items-center justify-center gap-6 rounded-xl border p-8 shadow-sm'>
          <div className='relative flex h-48 w-48 items-center justify-center'>
            <Skeleton className='bg-muted h-full w-full rounded-lg' />
          </div>

          <div className='flex w-full flex-col items-center gap-2 text-center'>
            <Skeleton className='bg-muted h-9 w-3/4' />
            <Skeleton className='bg-muted h-7 w-1/2' />

            <div className='mt-4 flex w-full flex-col items-center gap-1'>
              <Skeleton className='bg-muted h-5 w-1/3' />
              <Skeleton className='bg-muted h-5 w-1/4' />
            </div>
          </div>
        </div>

        {/* Right Column Skeleton */}
        <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className='bg-card flex flex-col items-center justify-center gap-2 rounded-xl border p-6 shadow-sm'
            >
              <Skeleton className='bg-muted h-4 w-16' />
              <Skeleton className='bg-muted h-8 w-8' />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
