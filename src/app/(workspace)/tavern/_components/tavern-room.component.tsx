'use client'

import { panelChrome } from '@/components/rpg/rpg-styles'
import { cn } from '@/lib/cn.lib'
import type { TavernMessage } from '@/types/trpc.types'
import Button from '@/ui/button.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowDown, Loader, Reload } from 'pixelarticons/react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import TavernComposer from './tavern-composer.component'
import TavernMessageList from './tavern-message-list.component'

interface TavernRoomProps {
  myUserId: string
}

type TFn = ReturnType<typeof useTranslation>['t']

const POLL_INTERVAL_MS = 15_000
const PAGE_SIZE = 50

function formatLastUpdated(timestamp: number, now: number, t: TFn) {
  const diff = now - timestamp
  if (diff < 10_000) return t('tavern.last_updated.just_now')
  if (diff < 60_000) return t('tavern.last_updated.seconds', { count: Math.floor(diff / 1000) })
  if (diff < 3_600_000) return t('tavern.last_updated.minutes', { count: Math.floor(diff / 60_000) })
  return new Date(timestamp).toLocaleTimeString()
}

function LastUpdatedLabel({ timestamp }: { timestamp: number | undefined }) {
  const { t } = useTranslation()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(interval)
  }, [])

  if (!timestamp) return <span className="tabular-nums">{t('tavern.last_updated.never')}</span>

  return (
    <span className="tabular-nums">
      {t('tavern.last_updated.label', { relative: formatLastUpdated(timestamp, now, t) })}
    </span>
  )
}

export default function TavernRoom({ myUserId }: TavernRoomProps) {
  const { t } = useTranslation()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const knownMessagesRef = useRef<Map<string, TavernMessage>>(new Map())
  const lastSeenIdRef = useRef<string | null>(null)
  const [hasMoreOlder, setHasMoreOlder] = useState(true)
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const [pendingNewCount, setPendingNewCount] = useState(0)
  const [mergeTick, setMergeTick] = useState(0)

  const messagesQuery = useQuery({
    ...trpcOptions.tavern.getMessages.queryOptions({ limit: PAGE_SIZE }),
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false
  })

  const liveMessages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data])

  const messages = useMemo<TavernMessage[]>(() => {
    const map = knownMessagesRef.current
    if (liveMessages.length > 0) {
      const liveIds = new Set(liveMessages.map((m) => m.id))
      const oldestLiveTime = new Date(liveMessages[0].createdAt).getTime()
      for (const [id, msg] of map) {
        if (new Date(msg.createdAt).getTime() >= oldestLiveTime && !liveIds.has(id)) {
          map.delete(id)
        }
      }
      for (const msg of liveMessages) map.set(msg.id, msg)
    }
    const all = Array.from(map.values())
    all.sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return diff !== 0 ? diff : a.id.localeCompare(b.id)
    })
    return all
  }, [liveMessages, mergeTick])

  const lastLiveId = liveMessages[liveMessages.length - 1]?.id

  useLayoutEffect(() => {
    if (!lastLiveId) return
    if (lastSeenIdRef.current === lastLiveId) return

    const container = scrollContainerRef.current
    if (!container) {
      lastSeenIdRef.current = lastLiveId
      return
    }

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    const isFirstLoad = lastSeenIdRef.current === null
    const isNearBottom = distanceFromBottom < 80

    if (isFirstLoad || isNearBottom) {
      anchorRef.current?.scrollIntoView({ behavior: isFirstLoad ? 'auto' : 'smooth' })
      setPendingNewCount(0)
    } else {
      const lastSeenIndex = liveMessages.findIndex((m) => m.id === lastSeenIdRef.current)
      const newlyArrived = lastSeenIndex >= 0 ? liveMessages.length - 1 - lastSeenIndex : 1
      setPendingNewCount((prev) => prev + Math.max(1, newlyArrived))
    }

    lastSeenIdRef.current = lastLiveId
  }, [lastLiveId, liveMessages])

  const [scrollRequest, setScrollRequest] = useState(0)

  useEffect(() => {
    if (scrollRequest === 0) return
    anchorRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [scrollRequest])

  const sendMutation = useMutation(
    trpcOptions.tavern.sendMessage.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpcOptions.tavern.getMessages.queryKey() })
        setPendingNewCount(0)
        setScrollRequest((n) => n + 1)
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

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: trpcOptions.tavern.getMessages.queryKey() })
  }

  const handleSend = (content: string) => {
    if (sendMutation.isPending) return
    sendMutation.mutate({ content })
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id })
  }

  const handleReport = (messageId: string) => {
    reportMutation.mutate({ messageId })
  }

  const handleLoadOlder = async () => {
    if (isLoadingOlder || !hasMoreOlder) return
    const oldestKnown = messages[0]
    if (!oldestKnown) return
    setIsLoadingOlder(true)
    try {
      const container = scrollContainerRef.current
      const previousScrollHeight = container?.scrollHeight ?? 0

      const result = await queryClient.fetchQuery(
        trpcOptions.tavern.getMessages.queryOptions({
          cursor: {
            createdAt: new Date(oldestKnown.createdAt).toISOString(),
            id: oldestKnown.id
          },
          limit: PAGE_SIZE
        })
      )
      if (result.length < PAGE_SIZE) setHasMoreOlder(false)
      if (result.length > 0) {
        const map = knownMessagesRef.current
        for (const msg of result) map.set(msg.id, msg)
        setMergeTick((n) => n + 1)
        requestAnimationFrame(() => {
          if (!container) return
          const newScrollHeight = container.scrollHeight
          container.scrollTop = newScrollHeight - previousScrollHeight
        })
      }
    } catch (error) {
      toast.error(t('tavern.error.load_older'), {
        description: error instanceof Error ? error.message : undefined
      })
    } finally {
      setIsLoadingOlder(false)
    }
  }

  const handleJumpToBottom = () => {
    setScrollRequest((n) => n + 1)
    setPendingNewCount(0)
  }

  const lastUpdatedAt = messagesQuery.dataUpdatedAt || undefined

  return (
    <div className="flex flex-col gap-2 h-[calc(100vh-160px)] min-h-120">
      <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        <LastUpdatedLabel timestamp={lastUpdatedAt} />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={messagesQuery.isFetching}
          className="gap-1.5"
        >
          {messagesQuery.isFetching ? (
            <Loader className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Reload className="h-3.5 w-3.5" />
          )}
          <span>{t('tavern.refresh')}</span>
        </Button>
      </div>

      <div ref={scrollContainerRef} className={cn(panelChrome, 'flex-1 overflow-y-auto p-4 relative')}>
        {hasMoreOlder && messages.length > 0 && (
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
              <span>{t('tavern.load_older')}</span>
            </Button>
          </div>
        )}

        <TavernMessageList
          messages={messages}
          myUserId={myUserId}
          onDelete={handleDelete}
          onReport={handleReport}
          isDeletePending={deleteMutation.isPending}
          isReportPending={reportMutation.isPending}
        />

        <div ref={anchorRef} />
      </div>

      {pendingNewCount > 0 && (
        <button
          type="button"
          onClick={handleJumpToBottom}
          className="self-center -mt-10 mb-2 inline-flex items-center gap-1.5 rounded-full border border-accent/50 bg-card px-3 py-1 text-xs font-medium text-accent shadow-md transition hover:bg-accent/10"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          {t('tavern.new_messages', { count: pendingNewCount })}
        </button>
      )}

      <TavernComposer onSubmit={handleSend} isPending={sendMutation.isPending} />
    </div>
  )
}
