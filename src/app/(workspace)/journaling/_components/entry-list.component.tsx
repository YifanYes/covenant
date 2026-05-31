'use client'

import { MOOD_COLOR_MAP } from '@shared/constants/journal.constants'
import JournalContent from './journal-content.component'
import EditEntryDialog from './edit-entry-dialog.component'
import { trpcOptions } from '@/utils/trpc.utils'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Loader } from 'pixelarticons/react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface JournalEntry {
  publicId: string
  content: string
  mood: string | null
  color: string | null
  createdAt: string | Date
}

// Page size for each infinite-scroll fetch. Enough to fill the panel on first paint.
const PAGE_SIZE = 8

export default function EntryList() {
  const { t } = useTranslation()
  // Cursor pagination: each scroll fetches one page (PAGE_SIZE rows) and appends it,
  // so payload stays constant — no whole-list refetch, never exceeds the schema cap.
  const { data, isPending, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery(
    trpcOptions.journaling.getAll.infiniteQueryOptions(
      { pageSize: PAGE_SIZE },
      {
        initialCursor: 1,
        getNextPageParam: (lastPage) => lastPage.nextCursor
      }
    )
  )
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)

  const entries = data?.pages.flatMap((page) => page.entries) ?? []

  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Infinite scroll: load the next page when the sentinel nears the bottom of the
  // panel. Recreating on isFetchingNextPage keeps it filling until the viewport is full.
  useEffect(() => {
    const sentinel = sentinelRef.current
    const root = scrollRef.current
    if (!sentinel || !root || !hasNextPage || isFetchingNextPage) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) fetchNextPage()
      },
      { root, rootMargin: '160px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isPending) {
    return (
      <div className="flex flex-col gap-3" aria-hidden>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-muted/20 h-24 animate-pulse rounded-xl border" />
        ))}
      </div>
    )
  }

  if (!entries.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="bg-muted/50 flex h-12 w-12 items-center justify-center rounded-full">
          <span className="text-lg">📜</span>
        </div>
        <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
          {t('journaling.empty_state.description')}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="flex h-full flex-col gap-4">
        <h3 className="text-muted-foreground shrink-0 text-sm font-semibold uppercase tracking-wide">
          {t('journaling.recent_entries')}
        </h3>

        {/* Mobile caps at 70dvh (a self-contained scroller so infinite scroll works);
            desktop fills the column via flex-1 and scrolls within the app-shell. */}
        <div
          ref={scrollRef}
          className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent -mr-2 flex max-h-[70dvh] min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-2 lg:max-h-none"
        >
          {entries.map((entry) => {
            const moodColor = entry.mood ? entry.color || MOOD_COLOR_MAP.get(entry.mood) : null
            const dateLabel = new Date(entry.createdAt).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            })

            return (
              <div
                key={entry.publicId}
                onClick={() => setEditingEntry(entry)}
                className="relative shrink-0 cursor-pointer overflow-hidden rounded-xl border bg-background p-4 transition-colors hover:bg-muted/20"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-muted-foreground text-xs font-medium">{dateLabel}</p>
                  <div className="flex items-center gap-2">
                    {entry.mood && (
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: moodColor || undefined }}
                        />
                        <span className="text-muted-foreground text-xs">{t(`moods.${entry.mood}`)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <JournalContent html={entry.content} className="line-clamp-3 text-sm" />
              </div>
            )
          })}

          {hasNextPage && <div ref={sentinelRef} className="h-px shrink-0" />}
          {isFetchingNextPage && (
            <div className="text-muted-foreground/60 flex shrink-0 justify-center py-2" aria-label={t('journaling.loading_more')}>
              <Loader className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {editingEntry && (
        <EditEntryDialog
          entry={editingEntry}
          open={!!editingEntry}
          onOpenChange={(open) => {
            if (!open) setEditingEntry(null)
          }}
        />
      )}
    </>
  )
}
