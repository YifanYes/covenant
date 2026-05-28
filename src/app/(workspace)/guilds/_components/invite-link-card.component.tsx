'use client'
import LoaderButton from '@/common/loader-button.component'
import { panelChrome } from '@/components/rpg/rpg-styles'
import Button from '@/ui/button.component'
import { cn } from '@/lib/cn.lib'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, Clock, Copy, Plus } from 'pixelarticons/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface InviteLinkCardProps {
  guildSlug: string
}

type TFn = ReturnType<typeof useTranslation>['t']

function inviteUrl(token: string) {
  if (typeof window === 'undefined') return `/guilds/join/${token}`
  return `${window.location.origin}/guilds/join/${token}`
}

function formatExpiry(expiresAt: Date, t: TFn) {
  const diff = expiresAt.getTime() - Date.now()
  if (diff <= 0) return { label: t('guilds.invite.expired'), expired: true }
  const days = Math.floor(diff / 86_400_000)
  if (days >= 1) return { label: t('guilds.invite.expires_in_days', { count: days }), expired: false }
  const hours = Math.floor(diff / 3_600_000)
  if (hours >= 1) return { label: t('guilds.invite.expires_in_hours', { count: hours }), expired: false }
  const mins = Math.max(1, Math.floor(diff / 60_000))
  return { label: t('guilds.invite.expires_in_minutes', { count: mins }), expired: false }
}

export default function InviteLinkCard({ guildSlug }: InviteLinkCardProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const invitesQuery = useQuery(trpcOptions.guilds.listInvites.queryOptions({ guildSlug }))
  const invites = invitesQuery.data ?? []
  const activeInvite = invites[0]

  const createMutation = useMutation(
    trpcOptions.guilds.createInvite.mutationOptions({
      onSuccess: async () => {
        toast.success(t('guilds.invite.created'))
        await queryClient.invalidateQueries({ queryKey: trpcOptions.guilds.listInvites.queryKey({ guildSlug }) })
      },
      onError: (error) => toast.error(t('guilds.invite.error_create'), { description: error.message })
    })
  )

  const revokeMutation = useMutation(
    trpcOptions.guilds.revokeInvite.mutationOptions({
      onSuccess: async () => {
        toast.success(t('guilds.invite.revoked'))
        await queryClient.invalidateQueries({ queryKey: trpcOptions.guilds.listInvites.queryKey({ guildSlug }) })
      },
      onError: (error) => toast.error(t('guilds.invite.error_revoke'), { description: error.message })
    })
  )

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(inviteUrl(token))
      setCopied(true)
      toast.success(t('guilds.invite.copied'))
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error(t('guilds.invite.copy_failed'))
    }
  }

  const expiry = activeInvite ? formatExpiry(new Date(activeInvite.expiresAt), t) : null
  const usage = activeInvite
    ? t('guilds.invite.uses_count', {
        used: activeInvite.usedCount,
        max: activeInvite.maxUses ?? t('guilds.invite.unlimited')
      })
    : null

  return (
    <div className={cn(panelChrome, 'p-5 space-y-4')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-title text-base">{t('guilds.invite.title')}</h3>
          <p className="text-muted-foreground text-xs mt-0.5 max-w-md">{t('guilds.invite.description')}</p>
        </div>
        <LoaderButton
          size="sm"
          isLoading={createMutation.isPending}
          onClick={() => createMutation.mutate({ guildSlug, expiresInHours: 168 })}
          icon={<Plus className="h-4 w-4" />}
          label={t('guilds.invite.generate')}
        />
      </div>

      {activeInvite && expiry && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={inviteUrl(activeInvite.token)}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 rounded-md border bg-background px-3 py-2 text-xs font-mono truncate"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyLink(activeInvite.token)}
              aria-label={t('guilds.invite.copied')}
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3 text-muted-foreground">
              <span className={cn('inline-flex items-center gap-1', expiry.expired && 'text-destructive')}>
                <Clock className="h-3.5 w-3.5" />
                {expiry.label}
              </span>
              <span className="tabular-nums">· {usage}</span>
            </div>
            <LoaderButton
              variant="ghost"
              size="sm"
              isLoading={revokeMutation.isPending}
              onClick={() => revokeMutation.mutate({ invitePublicId: activeInvite.publicId })}
              className="text-destructive hover:text-destructive"
              label={t('guilds.invite.revoke')}
            />
          </div>
        </div>
      )}

      {!activeInvite && !invitesQuery.isLoading && (
        <p className="text-muted-foreground text-xs">{t('guilds.invite.none')}</p>
      )}
    </div>
  )
}
