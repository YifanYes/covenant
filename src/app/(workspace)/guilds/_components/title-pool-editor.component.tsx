'use client'

import BaseConfirmDialog from '@/common/base-confirm-dialog.component'
import LoaderButton from '@/common/loader-button.component'
import Button from '@/ui/button.component'
import Input from '@/ui/input.component'
import { panelChrome, rpgDialogContent } from '@/components/rpg/rpg-styles'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { GUILD_TITLE_MAX_LENGTH, GUILD_TITLE_POOL_MAX_SIZE } from '@shared/constants/guild.constants'
import { useMutation } from '@tanstack/react-query'
import { Delete as Trash, Plus } from 'pixelarticons/react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface TitlePoolEditorProps {
  guildId: string
  initialTitles: string[]
  memberTitles: Array<string | null>
}

export default function TitlePoolEditor({ guildId, initialTitles, memberTitles }: TitlePoolEditorProps) {
  const { t } = useTranslation()
  const [titles, setTitles] = useState<string[]>(initialTitles)
  const [draft, setDraft] = useState('')
  const [pendingDelete, setPendingDelete] = useState<{ idx: number; title: string; count: number } | null>(null)

  const usageCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const title of memberTitles) {
      if (!title) continue
      counts.set(title, (counts.get(title) ?? 0) + 1)
    }
    return counts
  }, [memberTitles])

  const updateMutation = useMutation(
    trpcOptions.guilds.updateTitlePool.mutationOptions({
      onSuccess: async () => {
        toast.success(t('guilds.title_pool.success'))
        await queryClient.invalidateQueries({ queryKey: trpcOptions.guilds.getMyGuild.queryKey() })
      },
      onError: (error) => toast.error(t('guilds.title_pool.error'), { description: error.message })
    })
  )

  const addTitle = () => {
    const value = draft.trim()
    if (!value) return
    if (value.length > GUILD_TITLE_MAX_LENGTH) return
    if (titles.length >= GUILD_TITLE_POOL_MAX_SIZE) return
    if (titles.includes(value)) {
      setDraft('')
      return
    }
    setTitles([...titles, value])
    setDraft('')
  }

  const removeTitle = (idx: number) => {
    setTitles(titles.filter((_, i) => i !== idx))
  }

  const handleRemoveClick = (idx: number) => {
    const title = titles[idx]
    const count = usageCounts.get(title) ?? 0
    if (count > 0) {
      setPendingDelete({ idx, title, count })
      return
    }
    removeTitle(idx)
  }

  const confirmRemove = () => {
    if (!pendingDelete) return
    const next = titles.filter((_, i) => i !== pendingDelete.idx)
    setTitles(next)
    setPendingDelete(null)
    updateMutation.mutate({ guildId, titles: next })
  }

  const handleSave = () => {
    updateMutation.mutate({ guildId, titles })
  }

  const atCap = titles.length >= GUILD_TITLE_POOL_MAX_SIZE

  return (
    <div className={`${panelChrome} p-5 space-y-4`}>
      <div>
        <h3 className="font-title text-base">{t('guilds.title_pool.title')}</h3>
        <p className="text-muted-foreground text-xs mt-0.5">
          {t('guilds.title_pool.description', { max: GUILD_TITLE_POOL_MAX_SIZE, length: GUILD_TITLE_MAX_LENGTH })}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTitle()
            }
          }}
          placeholder={t('guilds.title_pool.add_placeholder')}
          maxLength={GUILD_TITLE_MAX_LENGTH}
          disabled={atCap || updateMutation.isPending}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={addTitle}
          disabled={!draft.trim() || atCap || updateMutation.isPending}
        >
          <Plus className="h-4 w-4" />
          {t('guilds.title_pool.add_cta')}
        </Button>
      </div>

      {titles.length === 0 ? (
        <p className="text-muted-foreground text-xs">{t('guilds.title_pool.empty')}</p>
      ) : (
        <ul className="space-y-1">
          {titles.map((title, idx) => (
            <li
              key={`${title}-${idx}`}
              className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-1.5"
            >
              <span className="text-sm truncate">{title}</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleRemoveClick(idx)}
                aria-label={t('guilds.title_pool.remove')}
                disabled={updateMutation.isPending}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-end">
        <LoaderButton
          size="sm"
          isLoading={updateMutation.isPending}
          onClick={handleSave}
          label={t('guilds.title_pool.save')}
        />
      </div>

      <BaseConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null)
        }}
        titleKey="guilds.title_pool.confirm_delete_title"
        descriptionKey="guilds.title_pool.confirm_delete_description"
        descriptionValues={{ title: pendingDelete?.title ?? '', count: pendingDelete?.count ?? 0 }}
        confirmLabelKey="guilds.title_pool.confirm_delete_cta"
        onConfirm={confirmRemove}
        contentClassName={rpgDialogContent}
      />
    </div>
  )
}
