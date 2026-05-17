'use client'

import BaseConfirmDialog from '@/common/base-confirm-dialog.component'
import { rpgDialogContent } from '@/components/rpg/rpg-styles'
import { cn } from '@/lib/cn.lib'
import type { TavernMessage } from '@/types/trpc.types'
import Tooltip, { TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/tooltip.component'
import { Coffee, Delete, Flag, Loader } from 'pixelarticons/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import UserAvatar from '../../guilds/_components/user-avatar.component'

const GROUP_WINDOW_MS = 5 * 60 * 1000

type TFn = ReturnType<typeof useTranslation>['t']

interface GroupedMessage extends TavernMessage {
  startsGroup: boolean
  endsGroup: boolean
}

function formatRelative(date: Date, t: TFn) {
  const diff = Date.now() - date.getTime()
  if (diff < 60_000) return t('tavern.relative.just_now')
  if (diff < 3_600_000) return t('tavern.relative.minutes', { count: Math.floor(diff / 60_000) })
  if (diff < 86_400_000) return t('tavern.relative.hours', { count: Math.floor(diff / 3_600_000) })
  if (diff < 7 * 86_400_000) return t('tavern.relative.days', { count: Math.floor(diff / 86_400_000) })
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface TavernMessageListProps {
  messages: TavernMessage[]
  myUserId: string
  onDelete: (id: string) => void
  onReport: (messageId: string) => void
  isDeletePending: boolean
  isReportPending: boolean
  isLoading: boolean
}

export default function TavernMessageList({
  messages,
  myUserId,
  onDelete,
  onReport,
  isDeletePending,
  isReportPending,
  isLoading
}: TavernMessageListProps) {
  const { t } = useTranslation()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [reportTarget, setReportTarget] = useState<string | null>(null)

  const closeDelete = () => setDeleteTarget(null)
  const closeReport = () => setReportTarget(null)

  if (messages.length === 0) {
    if (isLoading) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <Loader className="h-8 w-8 text-muted-foreground/50 animate-spin" />
        </div>
      )
    }

    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <Coffee className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-muted-foreground text-xl max-w-lg">{t('tavern.empty')}</p>
      </div>
    )
  }

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

  return (
    <TooltipProvider delayDuration={300}>
      <ul className="space-y-0.5">
        {grouped.map((message) => {
          const isMine = message.userId === myUserId
          const created = new Date(message.createdAt)
          const name = message.user.character?.name ?? message.user.name ?? t('tavern.unknown_user')

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
                  {isMine && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(message.id)}
                      disabled={isDeletePending}
                      title={t('tavern.delete_message')}
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
                        {message.content}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side={isMine ? 'left' : 'right'}>{created.toLocaleString()}</TooltipContent>
                  </Tooltip>

                  {!isMine && (
                    <button
                      type="button"
                      onClick={() => setReportTarget(message.id)}
                      disabled={isReportPending}
                      title={t('tavern.report_message')}
                      className="opacity-0 group-hover/msg:opacity-100 text-muted-foreground hover:text-destructive transition"
                    >
                      <Flag className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <BaseConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && closeDelete()}
        title="tavern.delete_confirm.title"
        description="tavern.delete_confirm.description"
        confirmLabel="tavern.delete_confirm.cta"
        isLoading={isDeletePending}
        contentClassName={rpgDialogContent}
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget)
          closeDelete()
        }}
      />

      <BaseConfirmDialog
        open={reportTarget !== null}
        onOpenChange={(open) => !open && closeReport()}
        title="tavern.report_confirm.title"
        description="tavern.report_confirm.description"
        confirmLabel="tavern.report_confirm.cta"
        isLoading={isReportPending}
        contentClassName={rpgDialogContent}
        onConfirm={() => {
          if (reportTarget) onReport(reportTarget)
          closeReport()
        }}
      />
    </TooltipProvider>
  )
}
