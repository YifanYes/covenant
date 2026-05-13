'use client'
import BaseConfirmDialog from '@/common/base-confirm-dialog.component'
import { panelChrome } from '@/components/rpg/rpg-styles'
import { cn } from '@/lib/cn.lib'
import { Badge } from '@/ui/badge.component'
import Button from '@/ui/button.component'
import DropdownMenu, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/ui/dropdown-menu.component'
import { Progress } from '@/ui/progress.component'
import Tabs, { TabsContent, TabsList, TabsTrigger } from '@/ui/tabs.component'
import { useSession } from '@/lib/auth.lib'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { GuildRole } from '@shared/schemas/guilds.schemas'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { Crown, Delete, Logout, MessageText, MoreVertical, Settings2, Users } from 'pixelarticons/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import GuildForum from '../_components/guild-forum.component'
import InviteLinkCard from '../_components/invite-link-card.component'
import MemberList from '../_components/member-list.component'

export default function GuildDetailPage() {
  const { t } = useTranslation()
  const params = useParams<{ guildId: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [dissolveOpen, setDissolveOpen] = useState(false)

  const guildQuery = useQuery(trpcOptions.guilds.getMyGuild.queryOptions())

  const leaveMutation = useMutation(
    trpcOptions.guilds.leave.mutationOptions({
      onSuccess: async () => {
        toast.success(t('guilds.success.leave'))
        await queryClient.invalidateQueries({ queryKey: trpcOptions.guilds.getMyGuild.queryKey() })
        router.push('/guilds')
      },
      onError: (error) => toast.error(t('guilds.error.leave'), { description: error.message })
    })
  )

  const dissolveMutation = useMutation(
    trpcOptions.guilds.dissolve.mutationOptions({
      onSuccess: async () => {
        toast.success(t('guilds.success.dissolve'))
        await queryClient.invalidateQueries({ queryKey: trpcOptions.guilds.getMyGuild.queryKey() })
        router.push('/guilds')
      },
      onError: (error) => toast.error(t('guilds.error.dissolve'), { description: error.message })
    })
  )

  if (guildQuery.isLoading) {
    return (
      <div className="min-h-screen w-full p-6 max-w-5xl mx-auto space-y-6">
        <div className={cn(panelChrome, 'p-6 animate-pulse')}>
          <div className="flex items-start gap-5">
            <div className="h-16 w-16 rounded-xl bg-muted/30" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-1/3 rounded bg-muted/30" />
              <div className="h-4 w-2/3 rounded bg-muted/20" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const data = guildQuery.data
  if (!data || data.guild.id !== params.guildId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">{t('guilds.errors.not_member')}</p>
      </div>
    )
  }

  const { guild, myRole } = data
  const myUserId = session?.user?.id ?? ''
  const isOwner = myRole === GuildRole.OWNER
  const canManage = myRole === GuildRole.OWNER || myRole === GuildRole.OFFICER
  const fillPct = Math.min(100, Math.round((guild.members.length / Math.max(1, guild.capacity)) * 100))
  const roleLabel =
    myRole === GuildRole.OWNER
      ? t('guilds.role.owner')
      : myRole === GuildRole.OFFICER
        ? t('guilds.role.officer')
        : t('guilds.role.member')

  return (
    <div className="min-h-screen w-full p-4 max-w-5xl mx-auto space-y-3">
      <Tabs defaultValue="forum">
        <header className={cn(panelChrome, 'px-4 py-3')}>
          <div className="flex items-center gap-3">
            <div
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-accent/40 bg-accent/10 font-title text-xl uppercase text-accent select-none"
            >
              {guild.name.charAt(0) || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-title text-lg truncate">{guild.name}</h1>
                <Badge variant={isOwner ? 'default' : 'outline'} className="gap-1">
                  {isOwner && <Crown className="h-3 w-3" />}
                  {roleLabel}
                </Badge>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Progress value={fillPct} className="h-1.5 max-w-40 flex-1" />
                <span className="text-muted-foreground text-[11px] tabular-nums shrink-0">
                  {guild.members.length} / {guild.capacity}
                </span>
              </div>
            </div>
            <TabsList className="shrink-0">
              <TabsTrigger value="forum" className="gap-1.5">
                <MessageText className="h-4 w-4" />
                <span className="hidden sm:inline">{t('guilds.tabs.forum')}</span>
              </TabsTrigger>
              <TabsTrigger value="members" className="gap-1.5">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">{t('guilds.tabs.members')}</span>
              </TabsTrigger>
              {canManage && (
                <TabsTrigger value="settings" className="gap-1.5">
                  <Settings2 className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('guilds.tabs.settings')}</span>
                </TabsTrigger>
              )}
            </TabsList>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Actions">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                {!isOwner && (
                  <DropdownMenuItem onClick={() => setLeaveOpen(true)}>
                    <Logout className="h-4 w-4" />
                    <span>{t('guilds.leave')}</span>
                  </DropdownMenuItem>
                )}
                {isOwner && (
                  <DropdownMenuItem variant="destructive" onClick={() => setDissolveOpen(true)}>
                    <Delete className="h-4 w-4" />
                    <span>{t('guilds.dissolve')}</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <TabsContent value="forum" className="mt-3">
          <GuildForum guildId={guild.id} myUserId={myUserId} myRole={myRole} />
        </TabsContent>

        <TabsContent value="members" className="mt-3">
          <MemberList guildId={guild.id} members={guild.members} myUserId={myUserId} myRole={myRole} />
        </TabsContent>

        {canManage && (
          <TabsContent value="settings" className="mt-3 space-y-4">
            <InviteLinkCard guildId={guild.id} />
          </TabsContent>
        )}
      </Tabs>

      <BaseConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title="guilds.leave_confirm.title"
        description="guilds.leave_confirm.description"
        onConfirm={() => leaveMutation.mutate()}
        isLoading={leaveMutation.isPending}
      />

      <BaseConfirmDialog
        open={dissolveOpen}
        onOpenChange={setDissolveOpen}
        title="guilds.dissolve_confirm.title"
        description="guilds.dissolve_confirm.description"
        onConfirm={() => dissolveMutation.mutate({ guildId: guild.id })}
        isLoading={dissolveMutation.isPending}
      />
    </div>
  )
}
