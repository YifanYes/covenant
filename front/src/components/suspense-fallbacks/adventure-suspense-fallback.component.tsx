import { useTranslation } from 'react-i18next'

export default function AdventureSuspenseFallback() {
  const { t } = useTranslation()

  return (
    <div className='flex h-full w-full flex-col gap-4 p-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold'>{t('adventure.title')}</h1>
      </div>

      {/* Tabs Skeleton */}
      <div className='flex gap-2'>
        <div className='bg-muted h-9 w-24 animate-pulse rounded-lg' />
        <div className='bg-muted h-9 w-24 animate-pulse rounded-lg' />
      </div>

      {/* Content Skeleton */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className='bg-muted w-full animate-pulse rounded-xl p-6'>
            <div className='bg-muted-foreground/20 mb-4 h-6 w-3/4 animate-pulse rounded' />
            <div className='bg-muted-foreground/20 mb-4 h-24 w-full animate-pulse rounded' />
            <div className='bg-muted-foreground/20 h-4 w-1/2 animate-pulse rounded' />
          </div>
        ))}
      </div>
    </div>
  )
}
