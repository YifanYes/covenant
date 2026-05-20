'use client'

import BaseConfirmDialog from '@/common/base-confirm-dialog.component'
import LastUpdatedLabel from '@/common/last-updated-label.component'
import MessageComposer from '@/common/message-composer.component'
import UserAvatar from '@/common/user-avatar.component'
import { panelChrome, rpgDialogContent } from '@/components/rpg/rpg-styles'
import { cn } from '@/lib/cn.lib'
import Button from '@/ui/button.component'
import Tooltip, { TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/tooltip.component'
import { ArrowDown, Delete, Flag, Loader, Reload } from 'pixelarticons/react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

const GROUP_WINDOW_MS = 5 * 60 * 1000

export interface ChatRoomMessage {
  id: string
  userId: string
  content: string
  createdAt: string | Date
  user: {
    character?: { name: string } | null
  }
}

interface MessageCursor {
  createdAt: string
  id: string
}

interface ConfirmCopy {
  titleKey: string
  descriptionKey: string
  ctaKey: string
}

interface DeleteConfig<T> {
  canDelete: (msg: T) => boolean
  onDelete: (msg: T) => void
  isPending: boolean
  confirm?: ConfirmCopy
}

interface ReportConfig<T> {
  canReport: (msg: T) => boolean
  onReport: (msg: T) => void
  isPending: boolean
  confirm: ConfirmCopy
}

interface PaginationConfig<T extends ChatRoomMessage> {
  fetchOlder: (cursor: MessageCursor) => Promise<T[]>
  pageSize: number
}

interface QueryConfig {
  isPending: boolean
  isFetching: boolean
  dataUpdatedAt: number | undefined
  onRefresh: () => void | Promise<void>
}

interface ComposerConfig {
  placeholder: string
  sendLabel: string
  maxLength: number
  warnRemaining: number
  dangerRemaining: number
  onSubmit: (content: string) => Promise<unknown> | void
  isPending: boolean
  formatCount: (length: number, max: number) => string
}

interface ChatRoomLabels {
  unknownUser: string
  deleteTitle: string
  reportTitle: string
  refresh: string
}

interface ChatRoomProps<T extends ChatRoomMessage> {
  liveMessages: T[]
  myUserId: string
  query: QueryConfig
  pagination?: PaginationConfig<T>
  deleteAction?: DeleteConfig<T>
  reportAction?: ReportConfig<T>
  empty: { icon: ReactNode; text: string }
  composer: ComposerConfig
  labels: ChatRoomLabels
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

interface GroupedMessage<T extends ChatRoomMessage> {
  msg: T
  startsGroup: boolean
  endsGroup: boolean
}

function groupMessages<T extends ChatRoomMessage>(messages: T[]): GroupedMessage<T>[] {
  return messages.map((msg, i) => {
    const prev = messages[i - 1]
    const next = messages[i + 1]
    const t = toDate(msg.createdAt).getTime()
    const prevSame = prev?.userId === msg.userId && t - toDate(prev.createdAt).getTime() < GROUP_WINDOW_MS
    const nextSame = next?.userId === msg.userId && toDate(next.createdAt).getTime() - t < GROUP_WINDOW_MS
    return { msg, startsGroup: !prevSame, endsGroup: !nextSame }
  })
}

function useRelativeFormatter() {
  const { t } = useTranslation()
  return useCallback(
    (date: Date) => {
      const diff = Date.now() - date.getTime()
      if (diff < 60_000) return t('common.chat.relative.just_now')
      if (diff < 3_600_000) return t('common.chat.relative.minutes', { count: Math.floor(diff / 60_000) })
      if (diff < 86_400_000) return t('common.chat.relative.hours', { count: Math.floor(diff / 3_600_000) })
      if (diff < 7 * 86_400_000) return t('common.chat.relative.days', { count: Math.floor(diff / 86_400_000) })
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    },
    [t]
  )
}

export default function ChatRoom<T extends ChatRoomMessage>({
  liveMessages,
  myUserId,
  query,
  pagination,
  deleteAction,
  reportAction,
  empty,
  composer,
  labels
}: ChatRoomProps<T>) {
  const { t } = useTranslation()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const expectingOlderRef = useRef<number | null>(null)
  const previousMessagesLengthRef = useRef(0)

  const [olderMessages, setOlderMessages] = useState<T[]>([])
  const [hasMoreOlder, setHasMoreOlder] = useState(Boolean(pagination))
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const [lastSeenId, setLastSeenId] = useState<string | null>(null)
  const [scrollRequest, setScrollRequest] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null)
  const [reportTarget, setReportTarget] = useState<T | null>(null)

  const messages = useMemo<T[]>(() => {
    if (!pagination) return liveMessages
    if (liveMessages.length === 0) {
      return [...olderMessages].sort((a, b) => {
        const diff = toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime()
        return diff !== 0 ? diff : a.id.localeCompare(b.id)
      })
    }
    const liveIds = new Set(liveMessages.map((m) => m.id))
    const oldestLiveTime = toDate(liveMessages[0].createdAt).getTime()
    const filteredOlder = olderMessages.filter(
      (m) => !liveIds.has(m.id) && toDate(m.createdAt).getTime() < oldestLiveTime
    )
    return [...filteredOlder, ...liveMessages].sort((a, b) => {
      const diff = toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime()
      return diff !== 0 ? diff : a.id.localeCompare(b.id)
    })
  }, [liveMessages, olderMessages, pagination])

  const lastMessageId = messages[messages.length - 1]?.id

  useLayoutEffect(() => {
    const prevLength = previousMessagesLengthRef.current
    previousMessagesLengthRef.current = messages.length

    const snapshot = expectingOlderRef.current
    if (snapshot != null && messages.length > prevLength) {
      const container = scrollContainerRef.current
      if (container) container.scrollTop = container.scrollHeight - snapshot
      expectingOlderRef.current = null
    }
  }, [messages.length])

  useLayoutEffect(() => {
    if (!lastMessageId) return
    if (expectingOlderRef.current != null) return
    if (lastSeenId === lastMessageId) return

    const container = scrollContainerRef.current
    if (!container) {
      setLastSeenId(lastMessageId)
      return
    }

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    const isFirstLoad = lastSeenId === null
    const isNearBottom = distanceFromBottom < 80

    if (isFirstLoad || isNearBottom) {
      anchorRef.current?.scrollIntoView({ behavior: isFirstLoad ? 'auto' : 'smooth' })
      setLastSeenId(lastMessageId)
    }
  }, [lastMessageId, lastSeenId])

  const pendingNewCount = useMemo(() => {
    if (!lastSeenId || !lastMessageId || lastSeenId === lastMessageId) return 0
    const idx = messages.findIndex((m) => m.id === lastSeenId)
    return idx < 0 ? 0 : messages.length - 1 - idx
  }, [messages, lastSeenId, lastMessageId])

  useEffect(() => {
    if (scrollRequest === 0) return
    anchorRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [scrollRequest])

  const handleRefresh = () => query.onRefresh()
  const requestJumpToBottom = () => {
    setScrollRequest((n) => n + 1)
    if (lastMessageId) setLastSeenId(lastMessageId)
  }

  const handleLoadOlder = async () => {
    if (!pagination || isLoadingOlder || !hasMoreOlder) return
    const oldest = messages[0]
    if (!oldest) return
    const container = scrollContainerRef.current
    if (!container) return
    expectingOlderRef.current = container.scrollHeight
    setIsLoadingOlder(true)
    try {
      const result = await pagination.fetchOlder({
        createdAt: toDate(oldest.createdAt).toISOString(),
        id: oldest.id
      })
      if (result.length < pagination.pageSize) setHasMoreOlder(false)
      const liveIds = new Set(liveMessages.map((m) => m.id))
      const liveOldestTime = liveMessages.length > 0 ? toDate(liveMessages[0].createdAt).getTime() : Infinity
      const liveNewestTime =
        liveMessages.length > 0 ? toDate(liveMessages[liveMessages.length - 1].createdAt).getTime() : -Infinity
      setOlderMessages((prev) => {
        const pruned = prev.filter((m) => {
          if (liveIds.has(m.id)) return false
          const t = toDate(m.createdAt).getTime()
          if (t >= liveOldestTime && t <= liveNewestTime) return false
          return true
        })
        const existing = new Set(pruned.map((m) => m.id))
        const additions = result.filter((m) => !existing.has(m.id) && !liveIds.has(m.id))
        if (additions.length === 0 && pruned.length === prev.length) return prev
        return [...pruned, ...additions]
      })
      if (result.length === 0) {
        expectingOlderRef.current = null
      }
    } catch {
      expectingOlderRef.current = null
    } finally {
      setIsLoadingOlder(false)
    }
  }

  const handleComposerSubmit = async (content: string) => {
    const result = composer.onSubmit(content)
    if (result instanceof Promise) await result
    if (lastMessageId) setLastSeenId(lastMessageId)
    setScrollRequest((n) => n + 1)
  }

  const grouped = groupMessages(messages)
  const formatRelative = useRelativeFormatter()

  return (
    <div className="flex flex-col gap-2 h-[calc(100vh-160px)] min-h-120">
      <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        <LastUpdatedLabel timestamp={query.dataUpdatedAt} />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={query.isFetching}
          className="gap-1.5"
        >
          {query.isFetching ? (
            <Loader className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Reload className="h-3.5 w-3.5" />
          )}
          <span>{labels.refresh}</span>
        </Button>
      </div>

      <div ref={scrollContainerRef} className={cn(panelChrome, 'flex-1 overflow-y-auto p-4 relative')}>
        {pagination && hasMoreOlder && messages.length > 0 && (
          <div className="mb-3 flex justify-center">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleLoadOlder}
              disabled={isLoadingOlder}
              className="gap-1.5 text-xs"
            >
              {isLoadingOlder && <Loader className="h-3.5 w-3.5 animate-spin" />}
              <span>{t('common.chat.load_older')}</span>
            </Button>
          </div>
        )}

        {messages.length === 0 ? (
          query.isPending ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <Loader className="h-8 w-8 text-muted-foreground/50 animate-spin" />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              {empty.icon}
              <p className="text-muted-foreground max-w-lg">{empty.text}</p>
            </div>
          )
        ) : (
          <TooltipProvider delayDuration={300}>
            <ul className="space-y-0.5">
              {grouped.map(({ msg, startsGroup, endsGroup }) => {
                const isMine = msg.userId === myUserId
                const created = toDate(msg.createdAt)
                const name = msg.user.character?.name ?? labels.unknownUser
                const canDelete = deleteAction?.canDelete(msg) ?? false
                const canReport = reportAction?.canReport(msg) ?? false

                const triggerDelete = () => {
                  if (!deleteAction) return
                  if (deleteAction.confirm) setDeleteTarget(msg)
                  else deleteAction.onDelete(msg)
                }
                const triggerReport = () => {
                  if (!reportAction) return
                  setReportTarget(msg)
                }

                return (
                  <li
                    key={msg.id}
                    className={cn(
                      'group/msg flex gap-2',
                      isMine ? 'flex-row-reverse' : 'flex-row',
                      startsGroup && 'mt-3 first:mt-0'
                    )}
                  >
                    {!isMine && (
                      <div className="w-9 shrink-0">
                        {endsGroup && <UserAvatar name={name} seed={msg.userId} />}
                      </div>
                    )}

                    <div className={cn('flex min-w-0 max-w-[75%] flex-col', isMine ? 'items-end' : 'items-start')}>
                      {startsGroup && !isMine && (
                        <div className="mb-1 flex items-baseline gap-2 px-1">
                          <span className="font-title text-sm">{name}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <time
                                className="text-muted-foreground text-[11px] tabular-nums"
                                dateTime={created.toISOString()}
                              >
                                {formatRelative(created)}
                              </time>
                            </TooltipTrigger>
                            <TooltipContent side="top">{created.toLocaleString()}</TooltipContent>
                          </Tooltip>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        {isMine && canDelete && (
                          <button
                            type="button"
                            onClick={triggerDelete}
                            disabled={deleteAction?.isPending}
                            title={labels.deleteTitle}
                            className="opacity-0 group-hover/msg:opacity-100 text-muted-foreground hover:text-destructive transition"
                          >
                            <Delete className="h-3.5 w-3.5" />
                          </button>
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap wrap-break-word',
                                isMine
                                  ? 'bg-accent/20 text-foreground rounded-br-md'
                                  : 'bg-muted/50 text-foreground rounded-bl-md'
                              )}
                            >
                              {msg.content}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side={isMine ? 'left' : 'right'}>{created.toLocaleString()}</TooltipContent>
                        </Tooltip>

                        {!isMine && (canDelete || canReport) && (
                          <div className="flex items-center gap-1">
                            {canDelete && (
                              <button
                                type="button"
                                onClick={triggerDelete}
                                disabled={deleteAction?.isPending}
                                title={labels.deleteTitle}
                                className="opacity-0 group-hover/msg:opacity-100 text-muted-foreground hover:text-destructive transition"
                              >
                                <Delete className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {canReport && (
                              <button
                                type="button"
                                onClick={triggerReport}
                                disabled={reportAction?.isPending}
                                title={labels.reportTitle}
                                className="opacity-0 group-hover/msg:opacity-100 text-muted-foreground hover:text-destructive transition"
                              >
                                <Flag className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </TooltipProvider>
        )}

        <div ref={anchorRef} />
      </div>

      {pendingNewCount > 0 && (
        <button
          type="button"
          onClick={requestJumpToBottom}
          className="self-center -mt-10 mb-2 inline-flex items-center gap-1.5 rounded-full border border-accent/50 bg-card px-3 py-1 text-xs font-medium text-accent shadow-md transition hover:bg-accent/10"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          {t('common.chat.new_messages', { count: pendingNewCount })}
        </button>
      )}

      <MessageComposer
        placeholder={composer.placeholder}
        sendLabel={composer.sendLabel}
        maxLength={composer.maxLength}
        warnRemaining={composer.warnRemaining}
        dangerRemaining={composer.dangerRemaining}
        onSubmit={handleComposerSubmit}
        isPending={composer.isPending}
        formatCount={composer.formatCount}
      />

      {deleteAction?.confirm && (
        <BaseConfirmDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          titleKey={deleteAction.confirm.titleKey}
          descriptionKey={deleteAction.confirm.descriptionKey}
          confirmLabelKey={deleteAction.confirm.ctaKey}
          isLoading={deleteAction.isPending}
          contentClassName={rpgDialogContent}
          onConfirm={() => {
            if (deleteTarget) deleteAction.onDelete(deleteTarget)
            setDeleteTarget(null)
          }}
        />
      )}

      {reportAction && (
        <BaseConfirmDialog
          open={reportTarget !== null}
          onOpenChange={(open) => !open && setReportTarget(null)}
          titleKey={reportAction.confirm.titleKey}
          descriptionKey={reportAction.confirm.descriptionKey}
          confirmLabelKey={reportAction.confirm.ctaKey}
          isLoading={reportAction.isPending}
          contentClassName={rpgDialogContent}
          onConfirm={() => {
            if (reportTarget) reportAction.onReport(reportTarget)
            setReportTarget(null)
          }}
        />
      )}
    </div>
  )
}
