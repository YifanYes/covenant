'use client'
import LoaderButton from '@/common/loader-button.component'
import { panelChrome } from '@/components/rpg/rpg-styles'
import Button from '@/ui/button.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { Shield } from 'pixelarticons/react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import GuildDescriptionView from '../../_components/guild-description-view.component'

export default function JoinByTokenPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useParams<{ token: string }>()
  const token = params.token

  const previewQuery = useQuery({
    ...trpcOptions.guilds.getInvitePreview.queryOptions({ token }),
    retry: false
  })

  const joinMutation = useMutation(
    trpcOptions.guilds.joinByToken.mutationOptions({
      onSuccess: async (result) => {
        toast.success(t('guilds.success.join'))
        await queryClient.invalidateQueries({ queryKey: trpcOptions.guilds.getMyGuild.queryKey() })
        router.push(`/guilds/${result.guildId}`)
      },
      onError: (error) => toast.error(t('guilds.error.join'), { description: error.message })
    })
  )

  if (previewQuery.isLoading) {
    return <div className="p-6 text-muted-foreground">{t('common.loading')}</div>
  }

  if (previewQuery.error || !previewQuery.data) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className={`${panelChrome} w-full max-w-2xl p-8 flex flex-col items-center gap-4 text-center`}>
          <Shield className="h-14 w-14 text-muted-foreground" />
          <h1 className="font-title text-xl">{t('guilds.join.invalid_title')}</h1>
          <p className="text-muted-foreground text-sm">{t('guilds.join.invalid_description')}</p>
          <Button variant="outline" onClick={() => router.push('/guilds')}>
            {t('guilds.back')}
          </Button>
        </div>
      </div>
    )
  }

  const { valid, reason, guild } = previewQuery.data

  return (
    <div className="min-h-screen p-6 flex items-center justify-center">
      <div className={`${panelChrome} w-full max-w-2xl p-8 space-y-6`}>
        <div className="flex flex-col items-center gap-3 text-center">
          <Shield className="h-14 w-14" />
          <h1 className="font-title text-2xl break-words">{guild.name}</h1>
          <p className="text-muted-foreground text-sm">
            {t('guilds.join.member_count', { count: guild.memberCount, capacity: guild.capacity })}
          </p>
        </div>

        {guild.description && (
          <div className="border-t border-border/60 pt-6">
            <GuildDescriptionView html={guild.description} className="text-base" />
          </div>
        )}

        {!valid && (
          <p className="text-destructive text-sm text-center">
            {t(`guilds.join.invalid_reason.${reason ?? 'unknown'}`)}
          </p>
        )}

        <div className="flex gap-2 justify-end pt-4 border-t border-border/60">
          <Button variant="outline" onClick={() => router.push('/guilds')}>
            {t('guilds.back')}
          </Button>
          <LoaderButton
            disabled={!valid}
            isLoading={joinMutation.isPending}
            onClick={() => joinMutation.mutate({ token })}
            label={t('guilds.join.cta')}
          />
        </div>
      </div>
    </div>
  )
}
