'use client'
import Button from '@/ui/button.component'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'

export default function WorldMapView() {
  const { t } = useTranslation()
  const router = useRouter()

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-hidden p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">{t('map.title')}</h1>
          <Button onClick={() => router.push('/quests')} variant="default" size="sm">
            {t('nav.quests')}
          </Button>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative h-full w-full overflow-auto rounded-lg border border-slate-700 bg-black">
        <div className="relative w-full min-w-200">
          <Image
            src="/assets/maps/santa_cruz.png"
            alt="World Map"
            width={1600}
            height={900}
            priority
            className="h-auto w-full opacity-50"
          />

          {/* Lore Overlay */}
          <div className="absolute top-4 left-4 max-w-md rounded bg-black/40 p-4 text-sm text-slate-200 backdrop-blur-sm">
            <p>{t('map.lore')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
