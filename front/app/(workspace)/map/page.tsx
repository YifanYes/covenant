'use client'
import Button from '@/ui/button.component'
import { trpc } from '@/utils/trpc.utils'
import { ScriptText } from '@nsmr/pixelart-react'
import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'

export default function WorldMapView() {
  const { t } = useTranslation()
  const router = useRouter()

  const { data: character } = useQuery(trpc.character.get.queryOptions())
  const { data: activities } = useQuery(
    trpc.activity.list.queryOptions({ characterId: character?.id }, { enabled: !!character?.id })
  )

  const activeActivity = activities?.find((a) => (a as any).isParticipating)

  return (
    <div className='flex h-full w-full flex-col gap-4 overflow-hidden p-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <h1 className='text-2xl font-bold text-white'>{t('map.title')}</h1>
          {activeActivity && (
            <Button onClick={() => router.push(`/map/activity/${activeActivity.id}`)} variant='default' size='sm'>
              {t('activities.continue')}
            </Button>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className='relative h-full w-full overflow-auto rounded-lg border border-slate-700 bg-black'>
        <div className='relative w-full min-w-200'>
          {/* Placeholder Map Image - w-full h-auto makes it resize with width, maintaining aspect ratio */}
          <Image src='/assets/maps/santa_cruz.png' alt='World Map' width={1600} height={900} className='h-auto w-full opacity-50' />

          {/* Lore Overlay */}
          <div className='absolute top-4 left-4 max-w-md rounded bg-black/40 p-4 text-sm text-slate-200 backdrop-blur-sm'>
            <p>{t('map.lore')}</p>
          </div>

          {/* Activity Markers */}
          {activities?.map((activity) => (
            <button
              key={activity.id}
              onClick={() => router.push(`/map/activity/${activity.id}`)}
              className='absolute -translate-x-1/2 -translate-y-1/2 transform cursor-pointer transition-transform hover:scale-110'
              style={{
                left: `${activity.position.x}%`,
                top: `${activity.position.y}%`
              }}
            >
              <div className='flex h-8 w-8 animate-pulse items-center justify-center rounded-full border-2 border-slate-400 bg-slate-900 text-white'>
                <ScriptText className='h-5 w-5' />
              </div>
              <div className='absolute top-full left-1/2 mt-1 -translate-x-1/2 rounded bg-black/80 px-2 py-1 text-xs whitespace-nowrap text-white'>
                {t(activity.name)}
              </div>
            </button>
          ))}
        </div>

        {activities?.length === 0 && (
          <div className='absolute inset-0 flex items-center justify-center text-slate-400'>
            {t('map.no_activities')}
          </div>
        )}
      </div>
    </div>
  )
}
