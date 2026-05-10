'use client'
import Button from '@/ui/button.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { Shield } from 'pixelarticons/react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

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
      <div className="min-h-screen p-6 flex flex-col items-center justify-center gap-4 text-center">
        <Shield className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">{t('guilds.join.invalid_title')}</h1>
        <p className="text-muted-foreground text-sm max-w-md">{t('guilds.join.invalid_description')}</p>
        <Button variant="outline" onClick={() => router.push('/guilds')}>
          {t('guilds.back')}
        </Button>
      </div>
    )
  }

  const { valid, reason, guild } = previewQuery.data

  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center gap-4">
      <Shield className="h-10 w-10" />
      <h1 className="text-2xl font-semibold">{guild.name}</h1>
      {guild.description && (
        <p className="text-muted-foreground text-sm max-w-md text-center">{guild.description}</p>
      )}
      <p className="text-muted-foreground text-sm">
        {t('guilds.join.member_count', { count: guild.memberCount, capacity: guild.capacity })}
      </p>

      {!valid && (
        <p className="text-destructive text-sm">
          {t(`guilds.join.invalid_reason.${reason ?? 'unknown'}`)}
        </p>
      )}

      <div className="flex gap-2 mt-4">
        <Button variant="outline" onClick={() => router.push('/guilds')}>
          {t('guilds.back')}
        </Button>
        <Button
          disabled={!valid || joinMutation.isPending}
          onClick={() => joinMutation.mutate({ token })}
        >
          {t('guilds.join.cta')}
        </Button>
      </div>
    </div>
  )
}
