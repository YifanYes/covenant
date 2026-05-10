'use client'
import Button from '@/ui/button.component'
import Textarea from '@/ui/textarea.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import type { GuildRoleType } from '@shared/schemas/guilds.schemas'
import { GuildRole } from '@shared/schemas/guilds.schemas'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Delete } from 'pixelarticons/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface GuildForumProps {
  guildId: string
  myUserId: string
  myRole: GuildRoleType
}

const POLL_INTERVAL_MS = 7_000

export default function GuildForum({ guildId, myUserId, myRole }: GuildForumProps) {
  const { t } = useTranslation()
  const [content, setContent] = useState('')
  const scrollAnchorRef = useRef<HTMLDivElement>(null)

  const messagesQuery = useQuery({
    ...trpcOptions.guilds.getMessages.queryOptions({ guildId }),
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false
  })

  const messages = messagesQuery.data ?? []
  const canModerate = myRole === GuildRole.OWNER || myRole === GuildRole.OFFICER

  const sendMutation = useMutation(
    trpcOptions.guilds.sendMessage.mutationOptions({
      onSuccess: async () => {
        setContent('')
        await queryClient.invalidateQueries({ queryKey: trpcOptions.guilds.getMessages.queryKey({ guildId }) })
      },
      onError: (error) => toast.error(t('guilds.forum.error.send'), { description: error.message })
    })
  )

  const deleteMutation = useMutation(
    trpcOptions.guilds.deleteMessage.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpcOptions.guilds.getMessages.queryKey({ guildId }) })
      },
      onError: (error) => toast.error(t('guilds.forum.error.delete'), { description: error.message })
    })
  )

  const lastMessageId = messages[messages.length - 1]?.id
  useEffect(() => {
    if (!lastMessageId) return
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lastMessageId])

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) return
    sendMutation.mutate({ guildId, content: trimmed })
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-220px)]">
      <div className="flex-1 overflow-y-auto rounded-md border bg-card p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-12">{t('guilds.forum.empty')}</p>
        ) : (
          messages.map((message) => {
            const canDelete = canModerate || message.userId === myUserId
            return (
              <div key={message.id} className="group flex gap-3">
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-title text-sm">{message.user.name ?? t('guilds.forum.unknown_user')}</span>
                    <span className="text-muted-foreground text-xs">
                      {new Date(message.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                </div>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100"
                    onClick={() => deleteMutation.mutate({ messageId: message.id })}
                    disabled={deleteMutation.isPending}
                    title={t('guilds.forum.delete_message')}
                  >
                    <Delete className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )
          })
        )}
        <div ref={scrollAnchorRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('guilds.forum.placeholder')}
          className="resize-none min-h-12 flex-1"
          maxLength={2000}
        />
        <Button type="submit" disabled={sendMutation.isPending || !content.trim()}>
          {t('guilds.forum.send')}
        </Button>
      </form>
    </div>
  )
}
