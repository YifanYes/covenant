'use client'
import BaseConfirmDialog from '@/common/base-confirm-dialog.component'
import { Badge } from '@/ui/badge.component'
import Button from '@/ui/button.component'
import Tabs, { TabsContent, TabsList, TabsTrigger } from '@/ui/tabs.component'
import { useSession } from '@/lib/auth.lib'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { GuildRole } from '@shared/schemas/guilds.schemas'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { Logout, Shield, Delete } from 'pixelarticons/react'
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
    return <div className="p-6 text-muted-foreground">{t('common.loading')}</div>
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

  return (
    <div className="min-h-screen w-full p-6 max-w-5xl mx-auto">
      <div className="flex flex-row justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <Shield className="h-8 w-8 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold truncate">{guild.name}</h1>
            {guild.description && (
              <p className="text-muted-foreground text-sm line-clamp-2">{guild.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline">
            {guild.members.length} / {guild.capacity}
          </Badge>
          {!isOwner && (
            <Button variant="outline" size="sm" onClick={() => setLeaveOpen(true)}>
              <Logout className="h-4 w-4" />
              <span>{t('guilds.leave')}</span>
            </Button>
          )}
          {isOwner && (
            <Button variant="destructive" size="sm" onClick={() => setDissolveOpen(true)}>
              <Delete className="h-4 w-4" />
              <span>{t('guilds.dissolve')}</span>
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="forum">
        <TabsList>
          <TabsTrigger value="forum">{t('guilds.tabs.forum')}</TabsTrigger>
          <TabsTrigger value="members">{t('guilds.tabs.members')}</TabsTrigger>
          {canManage && <TabsTrigger value="settings">{t('guilds.tabs.settings')}</TabsTrigger>}
        </TabsList>

        <TabsContent value="forum" className="mt-4">
          <GuildForum guildId={guild.id} myUserId={myUserId} myRole={myRole} />
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <MemberList guildId={guild.id} members={guild.members} myUserId={myUserId} myRole={myRole} />
        </TabsContent>

        {canManage && (
          <TabsContent value="settings" className="mt-4 space-y-4">
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
