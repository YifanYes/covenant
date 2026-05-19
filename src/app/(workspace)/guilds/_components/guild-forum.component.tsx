'use client'

import ChatRoom from '@/common/chat-room.component'
import type { GuildMessage } from '@/types/trpc.types'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { GUILD_MESSAGE_MAX_LENGTH } from '@shared/constants/guild.constants'
import type { GuildRoleType } from '@shared/schemas/guilds.schemas'
import { GuildRole } from '@shared/schemas/guilds.schemas'
import { useMutation, useQuery } from '@tanstack/react-query'
import { MessageText } from 'pixelarticons/react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface GuildForumProps {
  guildId: string
  myUserId: string
  myRole: GuildRoleType
}

const POLL_INTERVAL_MS = 7_000
const PAGE_SIZE = 50

export default function GuildForum({ guildId, myUserId, myRole }: GuildForumProps) {
  const { t } = useTranslation()
  const canModerate = myRole === GuildRole.OWNER || myRole === GuildRole.OFFICER

  const messagesQuery = useQuery({
    ...trpcOptions.guilds.getMessages.queryOptions({ guildId, limit: PAGE_SIZE }),
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false
  })

  const sendMutation = useMutation(
    trpcOptions.guilds.sendMessage.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpcOptions.guilds.getMessages.queryKey({ guildId }) })
      },
      onError: (error) => toast.error(t('guilds.forum.error.send'), { description: error.message })
    })
  )

  const deleteMutation = useMutation(
    trpcOptions.guilds.deleteMessage.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpcOptions.guilds.getMessages.queryKey({ guildId }) })
        toast.success(t('guilds.forum.success.delete'))
      },
      onError: (error) => toast.error(t('guilds.forum.error.delete'), { description: error.message })
    })
  )

  const reportMutation = useMutation(
    trpcOptions.guilds.reportMessage.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpcOptions.guilds.getMessages.queryKey({ guildId }) })
        toast.success(t('guilds.forum.success.report'))
      },
      onError: (error) => toast.error(t('guilds.forum.error.report'), { description: error.message })
    })
  )

  const fetchOlder = async (cursor: { createdAt: string; id: string }) => {
    try {
      return await queryClient.fetchQuery(
        trpcOptions.guilds.getMessages.queryOptions({ guildId, cursor, limit: PAGE_SIZE })
      )
    } catch (error) {
      toast.error(t('guilds.forum.error.load_older'), {
        description: error instanceof Error ? error.message : undefined
      })
      return []
    }
  }

  return (
    <ChatRoom<GuildMessage>
      liveMessages={messagesQuery.data ?? []}
      myUserId={myUserId}
      query={{
        isPending: messagesQuery.isPending,
        isFetching: messagesQuery.isFetching,
        dataUpdatedAt: messagesQuery.dataUpdatedAt || undefined,
        onRefresh: () =>
          queryClient.invalidateQueries({ queryKey: trpcOptions.guilds.getMessages.queryKey({ guildId }) })
      }}
      pagination={{ fetchOlder, pageSize: PAGE_SIZE }}
      deleteAction={{
        canDelete: (msg) => canModerate || msg.userId === myUserId,
        onDelete: (msg) => deleteMutation.mutate({ messageId: msg.id }),
        isPending: deleteMutation.isPending,
        confirm: {
          titleKey: 'guilds.forum.delete_confirm.title',
          descriptionKey: 'guilds.forum.delete_confirm.description',
          ctaKey: 'guilds.forum.delete_confirm.cta'
        }
      }}
      reportAction={{
        canReport: (msg) => msg.userId !== myUserId,
        onReport: (msg) => reportMutation.mutate({ messageId: msg.id }),
        isPending: reportMutation.isPending,
        confirm: {
          titleKey: 'guilds.forum.report_confirm.title',
          descriptionKey: 'guilds.forum.report_confirm.description',
          ctaKey: 'guilds.forum.report_confirm.cta'
        }
      }}
      empty={{
        icon: <MessageText className="h-10 w-10 text-muted-foreground/50" />,
        text: t('guilds.forum.empty')
      }}
      composer={{
        placeholder: t('guilds.forum.placeholder'),
        sendLabel: t('guilds.forum.send'),
        maxLength: GUILD_MESSAGE_MAX_LENGTH,
        warnRemaining: 200,
        dangerRemaining: 100,
        onSubmit: (content) => sendMutation.mutateAsync({ guildId, content }),
        isPending: sendMutation.isPending,
        formatCount: (count, max) => t('guilds.forum.character_count', { count, max })
      }}
      labels={{
        unknownUser: t('guilds.forum.unknown_user'),
        deleteTitle: t('guilds.forum.delete_message'),
        reportTitle: t('guilds.forum.report_message'),
        refresh: t('common.refresh')
      }}
    />
  )
}
