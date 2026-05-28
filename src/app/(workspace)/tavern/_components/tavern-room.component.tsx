'use client'

import ChatRoom from '@/common/chat-room.component'
import { TAVERN_MESSAGE_MAX_LENGTH } from '@/shared/constants/tavern.constants'
import type { TavernMessage } from '@/types/trpc.types'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Coffee } from 'pixelarticons/react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface TavernRoomProps {
  myUserId: string
}

const POLL_INTERVAL_MS = 15_000
const PAGE_SIZE = 50

export default function TavernRoom({ myUserId }: TavernRoomProps) {
  const { t } = useTranslation()

  const messagesQuery = useQuery({
    ...trpcOptions.tavern.getMessages.queryOptions({ limit: PAGE_SIZE }),
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false
  })

  const sendMutation = useMutation(
    trpcOptions.tavern.sendMessage.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpcOptions.tavern.getMessages.queryKey() })
      },
      onError: (error) => toast.error(t('tavern.error.send'), { description: error.message })
    })
  )

  const deleteMutation = useMutation(
    trpcOptions.tavern.deleteMessage.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpcOptions.tavern.getMessages.queryKey() })
        toast.success(t('tavern.success.delete'))
      },
      onError: (error) => toast.error(t('tavern.error.delete'), { description: error.message })
    })
  )

  const reportMutation = useMutation(
    trpcOptions.tavern.reportMessage.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpcOptions.tavern.getMessages.queryKey() })
        toast.success(t('tavern.success.report'))
      },
      onError: (error) => toast.error(t('tavern.error.report'), { description: error.message })
    })
  )

  const fetchOlder = async (cursor: { createdAt: string; publicId: string }) => {
    try {
      return await queryClient.fetchQuery(
        trpcOptions.tavern.getMessages.queryOptions({ cursor, limit: PAGE_SIZE })
      )
    } catch (error) {
      toast.error(t('tavern.error.load_older'), {
        description: error instanceof Error ? error.message : undefined
      })
      return []
    }
  }

  return (
    <ChatRoom<TavernMessage>
      liveMessages={messagesQuery.data ?? []}
      myUserId={myUserId}
      query={{
        isPending: messagesQuery.isPending,
        isFetching: messagesQuery.isFetching,
        dataUpdatedAt: messagesQuery.dataUpdatedAt || undefined,
        onRefresh: () =>
          queryClient.invalidateQueries({ queryKey: trpcOptions.tavern.getMessages.queryKey() })
      }}
      pagination={{ fetchOlder, pageSize: PAGE_SIZE }}
      deleteAction={{
        canDelete: (msg) => msg.userId === myUserId,
        onDelete: (msg) => deleteMutation.mutate({ publicId: msg.publicId }),
        isPending: deleteMutation.isPending,
        confirm: {
          titleKey: 'tavern.delete_confirm.title',
          descriptionKey: 'tavern.delete_confirm.description',
          ctaKey: 'tavern.delete_confirm.cta'
        }
      }}
      reportAction={{
        canReport: (msg) => msg.userId !== myUserId,
        onReport: (msg) => reportMutation.mutate({ publicId: msg.publicId }),
        isPending: reportMutation.isPending,
        confirm: {
          titleKey: 'tavern.report_confirm.title',
          descriptionKey: 'tavern.report_confirm.description',
          ctaKey: 'tavern.report_confirm.cta'
        }
      }}
      empty={{
        icon: <Coffee className="h-10 w-10 text-muted-foreground/50" />,
        text: t('tavern.empty')
      }}
      composer={{
        placeholder: t('tavern.composer.placeholder'),
        sendLabel: t('tavern.send'),
        maxLength: TAVERN_MESSAGE_MAX_LENGTH,
        warnRemaining: 100,
        dangerRemaining: 50,
        onSubmit: (content) => sendMutation.mutateAsync({ content }),
        isPending: sendMutation.isPending,
        formatCount: (count, max) => t('tavern.character_count', { count, max })
      }}
      labels={{
        unknownUser: t('tavern.unknown_user'),
        deleteTitle: t('tavern.delete_message'),
        reportTitle: t('tavern.report_message'),
        refresh: t('common.refresh')
      }}
    />
  )
}
