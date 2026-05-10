'use client'
import Button from '@/ui/button.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Copy, Plus } from 'pixelarticons/react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface InviteLinkCardProps {
  guildId: string
}

function inviteUrl(token: string) {
  if (typeof window === 'undefined') return `/guilds/join/${token}`
  return `${window.location.origin}/guilds/join/${token}`
}

export default function InviteLinkCard({ guildId }: InviteLinkCardProps) {
  const { t } = useTranslation()

  const invitesQuery = useQuery(trpcOptions.guilds.listInvites.queryOptions({ guildId }))
  const invites = invitesQuery.data ?? []
  const activeInvite = invites[0]

  const createMutation = useMutation(
    trpcOptions.guilds.createInvite.mutationOptions({
      onSuccess: async () => {
        toast.success(t('guilds.invite.created'))
        await queryClient.invalidateQueries({ queryKey: trpcOptions.guilds.listInvites.queryKey({ guildId }) })
      },
      onError: (error) => toast.error(t('guilds.invite.error_create'), { description: error.message })
    })
  )

  const revokeMutation = useMutation(
    trpcOptions.guilds.revokeInvite.mutationOptions({
      onSuccess: async () => {
        toast.success(t('guilds.invite.revoked'))
        await queryClient.invalidateQueries({ queryKey: trpcOptions.guilds.listInvites.queryKey({ guildId }) })
      },
      onError: (error) => toast.error(t('guilds.invite.error_revoke'), { description: error.message })
    })
  )

  const copyLink = (token: string) => {
    void navigator.clipboard.writeText(inviteUrl(token))
    toast.success(t('guilds.invite.copied'))
  }

  return (
    <div className="rounded-md border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-title text-sm">{t('guilds.invite.title')}</h3>
          <p className="text-muted-foreground text-xs">{t('guilds.invite.description')}</p>
        </div>
        <Button
          size="sm"
          onClick={() => createMutation.mutate({ guildId, expiresInHours: 168 })}
          disabled={createMutation.isPending}
        >
          <Plus className="h-4 w-4" />
          <span>{t('guilds.invite.generate')}</span>
        </Button>
      </div>

      {activeInvite && (
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={inviteUrl(activeInvite.token)}
            className="flex-1 rounded-md border bg-background px-3 py-2 text-xs font-mono"
          />
          <Button variant="outline" size="icon" onClick={() => copyLink(activeInvite.token)}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => revokeMutation.mutate({ inviteId: activeInvite.id })}
            disabled={revokeMutation.isPending}
          >
            {t('guilds.invite.revoke')}
          </Button>
        </div>
      )}

      {!activeInvite && !invitesQuery.isLoading && (
        <p className="text-muted-foreground text-xs">{t('guilds.invite.none')}</p>
      )}
    </div>
  )
}
