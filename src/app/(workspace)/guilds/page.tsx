'use client'
import EmptyState from '@/components/empty-state.component'
import { trpcOptions } from '@/utils/trpc.utils'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Shield } from 'pixelarticons/react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import CreateGuildDialog from './_components/create-guild-dialog.component'
import JoinByLinkInput from './_components/join-by-link-input.component'

export default function GuildsLandingPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const myGuildQuery = useQuery(trpcOptions.guilds.getMyGuild.queryOptions())

  useEffect(() => {
    if (myGuildQuery.data?.guild) {
      router.replace(`/guilds/${myGuildQuery.data.guild.id}`)
    }
  }, [myGuildQuery.data, router])

  if (myGuildQuery.isLoading || myGuildQuery.data?.guild) {
    return null
  }

  return (
    <div className="min-h-screen w-full p-4">
      <div className="flex flex-row justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold">{t('guilds.title')}</h1>
      </div>
      <EmptyState
        icon={<Shield className="h-8 w-8" />}
        title={t('guilds.empty.title')}
        description={t('guilds.empty.description')}
        descriptionClassName="max-w-lg"
        actionFullWidth
        action={
          <div className="flex w-full max-w-2xl flex-col items-center gap-4">
            <CreateGuildDialog />
            <div className="flex w-full items-center gap-3 text-muted-foreground text-md">
              <div className="h-px flex-1 bg-border" />
              <span>{t('guilds.empty.or')}</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <JoinByLinkInput />
          </div>
        }
      />
    </div>
  )
}
