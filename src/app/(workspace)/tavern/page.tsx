'use client'

import { useSession } from '@/lib/auth.lib'
import { useTranslation } from 'react-i18next'
import TavernRoom from './_components/tavern-room.component'

export default function TavernPage() {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const myUserId = session?.user?.id

  return (
    <div className="min-h-screen w-full p-4 mx-auto space-y-3">
      <header className="px-1 space-y-1">
        <h1 className="font-title text-xl">{t('tavern.title')}</h1>
        <p className="text-muted-foreground text-base">{t('tavern.subtitle')}</p>
      </header>
      {myUserId ? <TavernRoom myUserId={myUserId} /> : null}
    </div>
  )
}
