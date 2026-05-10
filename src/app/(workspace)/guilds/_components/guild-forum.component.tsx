'use client'
import LoaderButton from '@/common/loader-button.component'
import Textarea from '@/ui/textarea.component'
import Tooltip, { TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/tooltip.component'
import { cn } from '@/lib/cn.lib'
import type { GuildMessage } from '@/types/trpc.types'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import type { GuildRoleType } from '@shared/schemas/guilds.schemas'
import { GuildRole } from '@shared/schemas/guilds.schemas'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Delete, MessageText, Send } from 'pixelarticons/react'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import UserAvatar from './user-avatar.component'

interface GuildForumProps {
  guildId: string
  myUserId: string
  myRole: GuildRoleType
}

const POLL_INTERVAL_MS = 7_000
const MAX_LENGTH = 2000
const GROUP_WINDOW_MS = 5 * 60 * 1000

type TFn = ReturnType<typeof useTranslation>['t']

function formatRelative(date: Date, t: TFn) {
  const diff = Date.now() - date.getTime()
  if (diff < 60_000) return t('guilds.forum.relative.just_now')
  if (diff < 3_600_000) return t('guilds.forum.relative.minutes', { count: Math.floor(diff / 60_000) })
  if (diff < 86_400_000) return t('guilds.forum.relative.hours', { count: Math.floor(diff / 3_600_000) })
  if (diff < 7 * 86_400_000) return t('guilds.forum.relative.days', { count: Math.floor(diff / 86_400_000) })
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface GroupedMessage extends GuildMessage {
  startsGroup: boolean
  endsGroup: boolean
}

export default function GuildForum({ guildId, myUserId, myRole }: GuildForumProps) {
  const { t } = useTranslation()
  const [content, setContent] = useState('')
  const scrollAnchorRef = useRef<HTMLDivElement>(null)

  const messagesQuery = useQuery({
    ...trpcOptions.guilds.getMessages.queryOptions({ guildId }),
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false
  })

  const messages: GuildMessage[] = messagesQuery.data ?? []
  const canModerate = myRole === GuildRole.OWNER || myRole === GuildRole.OFFICER

  const grouped: GroupedMessage[] = messages.map((msg, i) => {
    const prev = messages[i - 1]
    const next = messages[i + 1]
    const prevSame =
      prev?.userId === msg.userId &&
      new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_WINDOW_MS
    const nextSame =
      next?.userId === msg.userId &&
      new Date(next.createdAt).getTime() - new Date(msg.createdAt).getTime() < GROUP_WINDOW_MS
    return { ...msg, startsGroup: !prevSame, endsGroup: !nextSame }
  })

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

  const trimmed = content.trim()
  const remaining = MAX_LENGTH - content.length

  const submit = () => {
    if (!trimmed || sendMutation.isPending) return
    sendMutation.mutate({ guildId, content: trimmed })
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    submit()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  const renderDeleteButton = (messageId: string) => (
    <button
      type="button"
      onClick={() => deleteMutation.mutate({ messageId })}
      disabled={deleteMutation.isPending}
      title={t('guilds.forum.delete_message')}
      className="opacity-0 group-hover/msg:opacity-100 text-muted-foreground hover:text-destructive transition"
    >
      <Delete className="h-3.5 w-3.5" />
    </button>
  )

  return (
    <div className="flex flex-col gap-2 h-[calc(100vh-160px)] min-h-[480px]">
      <div className="flex-1 overflow-y-auto rounded-xl border bg-card/40 p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <MessageText className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm max-w-sm">{t('guilds.forum.empty')}</p>
          </div>
        ) : (
          <TooltipProvider delayDuration={300}>
            <ul className="space-y-0.5">
              {grouped.map((message) => {
                const canDelete = canModerate || message.userId === myUserId
                const isMine = message.userId === myUserId
                const created = new Date(message.createdAt)
                const name = message.user.character?.name ?? message.user.name ?? t('guilds.forum.unknown_user')

                return (
                  <li
                    key={message.id}
                    className={cn(
                      'group/msg flex gap-2',
                      isMine ? 'flex-row-reverse' : 'flex-row',
                      message.startsGroup && 'mt-3 first:mt-0'
                    )}
                  >
                    {!isMine && (
                      <div className="w-9 shrink-0">
                        {message.endsGroup && <UserAvatar name={name} seed={message.userId} />}
                      </div>
                    )}

                    <div className={cn('flex min-w-0 max-w-[75%] flex-col', isMine ? 'items-end' : 'items-start')}>
                      {message.startsGroup && !isMine && (
                        <div className="mb-1 flex items-baseline gap-2 px-1">
                          <span className="font-title text-sm">{name}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <time
                                className="text-muted-foreground text-[11px] tabular-nums"
                                dateTime={created.toISOString()}
                              >
                                {formatRelative(created, t)}
                              </time>
                            </TooltipTrigger>
                            <TooltipContent side="top">{created.toLocaleString()}</TooltipContent>
                          </Tooltip>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        {isMine && canDelete && renderDeleteButton(message.id)}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words',
                                isMine
                                  ? 'bg-accent/20 text-foreground rounded-br-md'
                                  : 'bg-muted/50 text-foreground rounded-bl-md'
                              )}
                            >
                              {message.content}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side={isMine ? 'left' : 'right'}>
                            {created.toLocaleString()}
                          </TooltipContent>
                        </Tooltip>

                        {!isMine && canDelete && renderDeleteButton(message.id)}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </TooltipProvider>
        )}
        <div ref={scrollAnchorRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border bg-card/40 p-2 focus-within:border-accent/50 transition"
      >
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('guilds.forum.placeholder')}
          className="resize-none min-h-12 border-0 bg-transparent shadow-none focus-visible:ring-0 px-2"
          maxLength={MAX_LENGTH}
        />
        <div className="flex items-center justify-between pl-2 pr-1 pt-1">
          <span
            className={cn(
              'text-[11px] tabular-nums',
              remaining < 100 ? 'text-destructive' : remaining < 200 ? 'text-amber-400' : 'text-muted-foreground/60'
            )}
          >
            {remaining < 200 ? remaining : ''}
          </span>
          <LoaderButton
            type="submit"
            size="sm"
            isLoading={sendMutation.isPending}
            disabled={!trimmed}
            className="gap-1.5"
            icon={<Send className="h-4 w-4" />}
            label={t('guilds.forum.send')}
          />
        </div>
      </form>
    </div>
  )
}
