'use client'

import LoaderButton from '@/common/loader-button.component'
import Button from '@/ui/button.component'
import TiptapEditor from '@/ui/tiptap-editor.component'
import { panelChrome } from '@/components/rpg/rpg-styles'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { GUILD_DESCRIPTION_MAX_LENGTH } from '@shared/constants/guild.constants'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface GuildDescriptionEditorProps {
  guildId: string
  initialHtml: string
  onClose?: () => void
}

export default function GuildDescriptionEditor({ guildId, initialHtml, onClose }: GuildDescriptionEditorProps) {
  const { t } = useTranslation()
  const [content, setContent] = useState(initialHtml)

  const updateMutation = useMutation(
    trpcOptions.guilds.update.mutationOptions({
      onSuccess: async () => {
        toast.success(t('guilds.description.success'))
        await queryClient.invalidateQueries({ queryKey: trpcOptions.guilds.getMyGuild.queryKey() })
        onClose?.()
      },
      onError: (error) => toast.error(t('guilds.description.error'), { description: error.message })
    })
  )

  const plainLength = content.replace(/<[^>]*>/g, '').trim().length
  const overLimit = plainLength > GUILD_DESCRIPTION_MAX_LENGTH

  const handleSave = () => {
    updateMutation.mutate({ guildId, description: content })
  }

  return (
    <div className={`${panelChrome} p-4 space-y-3`}>
      <TiptapEditor
        content={content}
        onChange={setContent}
        placeholder={t('guilds.description.placeholder')}
        disabled={updateMutation.isPending}
        className="min-h-40"
      />
      <div className="flex items-center justify-between gap-3">
        <span
          className={
            overLimit
              ? 'text-destructive text-xs tabular-nums'
              : 'text-muted-foreground text-xs tabular-nums'
          }
        >
          {t('guilds.description.char_count', { count: plainLength, max: GUILD_DESCRIPTION_MAX_LENGTH })}
        </span>
        <div className="flex items-center gap-2">
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} disabled={updateMutation.isPending}>
              {t('guilds.description.cancel')}
            </Button>
          )}
          <LoaderButton
            size="sm"
            isLoading={updateMutation.isPending}
            disabled={overLimit}
            onClick={handleSave}
            label={t('guilds.description.save')}
          />
        </div>
      </div>
    </div>
  )
}
