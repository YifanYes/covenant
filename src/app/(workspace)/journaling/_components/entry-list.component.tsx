'use client'

import { MOOD_COLOR_MAP } from '@shared/constants/journal.constants'
import JournalContent from './journal-content.component'
import EditEntryDialog from './edit-entry-dialog.component'
import { trpcOptions } from '@/utils/trpc.utils'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'

interface JournalEntry {
  id: string
  content: string
  mood: string | null
  color: string | null
  createdAt: string
}

export default function EntryList() {
  const { t } = useTranslation()
  const { data } = useSuspenseQuery(trpcOptions.journaling.getAll.queryOptions({ page: 1, pageSize: 7 }))
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)

  if (!data?.entries?.length) {
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
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('journaling.recent_entries')}
        </h3>
        <div className="flex flex-col gap-3">
          {data.entries.map((entry) => {
            const moodColor = entry.mood ? entry.color || MOOD_COLOR_MAP.get(entry.mood) : null
            const dateLabel = new Date(entry.createdAt).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            })

            return (
              <div
                key={entry.id}
                onClick={() => setEditingEntry(entry)}
                className="relative cursor-pointer overflow-hidden rounded-xl border bg-background p-4 transition-colors hover:bg-muted/20"
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
