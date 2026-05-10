'use client'
import { Badge } from '@/ui/badge.component'
import Button from '@/ui/button.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import type { GuildRoleType } from '@shared/schemas/guilds.schemas'
import { GuildRole } from '@shared/schemas/guilds.schemas'
import { useMutation } from '@tanstack/react-query'
import { Delete } from 'pixelarticons/react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface MemberListProps {
  guildId: string
  members: Array<{
    id: string
    userId: string
    role: string
    joinedAt: Date | string
    user: { id: string; name: string | null; image: string | null }
  }>
  myUserId: string
  myRole: GuildRoleType
}

function roleLabel(role: string, t: (k: string) => string) {
  if (role === GuildRole.OWNER) return t('guilds.role.owner')
  if (role === GuildRole.OFFICER) return t('guilds.role.officer')
  return t('guilds.role.member')
}

export default function MemberList({ guildId, members, myUserId, myRole }: MemberListProps) {
  const { t } = useTranslation()

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
    <ul className="divide-y rounded-md border">
      {members.map((member) => {
        const isMe = member.userId === myUserId
        const isOwner = member.role === GuildRole.OWNER
        const showKick = !isMe && canKick(member.role)
        const showRoleToggle = myRole === GuildRole.OWNER && !isMe && !isOwner

        return (
          <li key={member.id} className="flex items-center justify-between gap-3 p-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex flex-col min-w-0">
                <span className="font-title text-sm truncate">
                  {member.user.name ?? t('guilds.forum.unknown_user')}
                  {isMe && <span className="text-muted-foreground ml-1">{t('guilds.member.you')}</span>}
                </span>
                <span className="text-muted-foreground text-xs">
                  {t('guilds.member.joined')} {new Date(member.joinedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isOwner ? 'default' : 'outline'}>{roleLabel(member.role, t)}</Badge>
              {showRoleToggle && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    roleMutation.mutate({
                      guildId,
                      targetUserId: member.userId,
                      role: member.role === GuildRole.OFFICER ? GuildRole.MEMBER : GuildRole.OFFICER
                    })
                  }
                  disabled={roleMutation.isPending}
                >
                  {member.role === GuildRole.OFFICER ? t('guilds.member.demote') : t('guilds.member.promote')}
                </Button>
              )}
              {showKick && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => kickMutation.mutate({ guildId, targetUserId: member.userId })}
                  disabled={kickMutation.isPending}
                  title={t('guilds.member.kick')}
                >
                  <Delete className="h-4 w-4" />
                </Button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
