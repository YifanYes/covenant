'use client'
import { panelChrome } from '@/components/rpg/rpg-styles'
import { Badge } from '@/ui/badge.component'
import Button from '@/ui/button.component'
import Tooltip, { TooltipContent, TooltipTrigger } from '@/ui/tooltip.component'
import { cn } from '@/lib/cn.lib'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import type { GuildRoleType } from '@shared/schemas/guilds.schemas'
import { GuildRole } from '@shared/schemas/guilds.schemas'
import { useMutation } from '@tanstack/react-query'
import { Crown, Shield, UserMinus, UserPlus, UserX } from 'pixelarticons/react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import UserAvatar from './user-avatar.component'

interface MemberListProps {
  guildId: string
  members: Array<{
    id: string
    userId: string
    role: string
    joinedAt: Date | string
    user: {
      id: string
      name: string | null
      image: string | null
      character: { name: string } | null
    }
  }>
  myUserId: string
  myRole: GuildRoleType
}

const ROLE_ORDER: Record<GuildRoleType, number> = {
  [GuildRole.OWNER]: 0,
  [GuildRole.OFFICER]: 1,
  [GuildRole.MEMBER]: 2
}

function roleLabel(role: string, t: (k: string) => string) {
  if (role === GuildRole.OWNER) return t('guilds.role.owner')
  if (role === GuildRole.OFFICER) return t('guilds.role.officer')
  return t('guilds.role.member')
}

function RoleBadge({ role, label }: { role: string; label: string }) {
  if (role === GuildRole.OWNER) {
    return (
      <Badge className="gap-1 bg-accent/20 text-accent border-accent/40 hover:bg-accent/20">
        <Crown className="h-3 w-3" />
        {label}
      </Badge>
    )
  }
  if (role === GuildRole.OFFICER) {
    return (
      <Badge variant="outline" className="gap-1 border-secondary/60 text-secondary-foreground">
        <Shield className="h-3 w-3" />
        {label}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      {label}
    </Badge>
  )
}

export default function MemberList({ guildId, members, myUserId, myRole }: MemberListProps) {
  const { t } = useTranslation()

  const sorted = [...members].sort((a, b) => {
    const ra = ROLE_ORDER[a.role as GuildRoleType] ?? 99
    const rb = ROLE_ORDER[b.role as GuildRoleType] ?? 99
    if (ra !== rb) return ra - rb
    return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
  })

  const kickMutation = useMutation(
    trpcOptions.guilds.kickMember.mutationOptions({
      onSuccess: async () => {
        toast.success(t('guilds.success.kick'))
        await queryClient.invalidateQueries({ queryKey: trpcOptions.guilds.getMyGuild.queryKey() })
      },
      onError: (error) => toast.error(t('guilds.error.kick'), { description: error.message })
    })
  )

  const roleMutation = useMutation(
    trpcOptions.guilds.updateRole.mutationOptions({
      onSuccess: async () => {
        toast.success(t('guilds.success.role'))
        await queryClient.invalidateQueries({ queryKey: trpcOptions.guilds.getMyGuild.queryKey() })
      },
      onError: (error) => toast.error(t('guilds.error.role'), { description: error.message })
    })
  )

  const canKick = (targetRole: string) => {
    if (myRole === GuildRole.OWNER) return targetRole !== GuildRole.OWNER
    if (myRole === GuildRole.OFFICER) return targetRole === GuildRole.MEMBER
    return false
  }

  return (
    <ul className={cn(panelChrome, 'divide-y overflow-hidden')}>
      {sorted.map((member) => {
        const isMe = member.userId === myUserId
        const isOwner = member.role === GuildRole.OWNER
        const showKick = !isMe && canKick(member.role)
        const showRoleToggle = myRole === GuildRole.OWNER && !isMe && !isOwner
        const promote = member.role === GuildRole.MEMBER
        const name = member.user.character?.name ?? member.user.name ?? t('guilds.forum.unknown_user')
        const joined = new Date(member.joinedAt)

        return (
          <li
            key={member.id}
            className={cn('group/row flex items-center gap-3 p-3 transition-colors hover:bg-muted/30', isMe && 'bg-accent/5')}
          >
            <UserAvatar name={name} seed={member.userId} />
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-title text-sm truncate">{name}</span>
                {isMe && <span className="text-muted-foreground text-xs">{t('guilds.member.you')}</span>}
              </div>
              <span className="text-muted-foreground text-xs">
                {t('guilds.member.joined')} {joined.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <RoleBadge role={member.role} label={roleLabel(member.role, t)} />
              {showRoleToggle && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        roleMutation.mutate({
                          guildId,
                          targetUserId: member.userId,
                          role: promote ? GuildRole.OFFICER : GuildRole.MEMBER
                        })
                      }
                      disabled={roleMutation.isPending}
                      className="opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
                    >
                      {promote ? <UserPlus className="h-4 w-4" /> : <UserMinus className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {promote ? t('guilds.member.promote') : t('guilds.member.demote')}
                  </TooltipContent>
                </Tooltip>
              )}
              {showKick && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => kickMutation.mutate({ guildId, targetUserId: member.userId })}
                      disabled={kickMutation.isPending}
                      className="opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 text-destructive hover:text-destructive"
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('guilds.member.kick')}</TooltipContent>
                </Tooltip>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
