'use client'

import LoaderButton from '@/common/loader-button.component'
import { panelChrome } from '@/components/rpg/rpg-styles'
import { cn } from '@/lib/cn.lib'
import { TAVERN_MESSAGE_MAX_LENGTH } from '@/shared/constants/tavern.constants'
import { sendTavernMessageSchema, type SendTavernMessageType } from '@/shared/schemas/tavern.schemas'
import Textarea from '@/ui/textarea.component'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Send } from 'pixelarticons/react'
import { type KeyboardEvent } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

interface TavernComposerProps {
  onSubmit: (content: string) => void
  isPending: boolean
}

export default function TavernComposer({ onSubmit, isPending }: TavernComposerProps) {
  const { t } = useTranslation()

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isValid }
  } = useForm<SendTavernMessageType>({
    resolver: standardSchemaResolver(sendTavernMessageSchema),
    mode: 'onChange',
    defaultValues: { content: '' }
  })

  const content = useWatch({ control, name: 'content' }) ?? ''
  const remaining = TAVERN_MESSAGE_MAX_LENGTH - content.length

  const submit = handleSubmit((data) => {
    if (isPending) return
    onSubmit(data.content)
    reset({ content: '' })
  })

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form onSubmit={submit} className={cn(panelChrome, 'p-2 focus-within:border-accent/50 transition')}>
      <Textarea
        {...register('content')}
        onKeyDown={handleKeyDown}
        placeholder={t('tavern.composer.placeholder')}
        className="resize-none min-h-12 border-0 bg-transparent shadow-none focus-visible:ring-0 px-2"
        maxLength={TAVERN_MESSAGE_MAX_LENGTH}
      />
      <div className="flex items-center justify-between pl-2 pr-1 pt-1">
        <span
          className={cn(
            'text-[11px] tabular-nums',
            remaining < 50 ? 'text-destructive' : remaining < 100 ? 'text-amber-400' : 'text-muted-foreground/60'
          )}
        >
          {t('tavern.character_count', { count: content.length, max: TAVERN_MESSAGE_MAX_LENGTH })}
        </span>
        <LoaderButton
          type="submit"
          size="sm"
          isLoading={isPending}
          disabled={!isValid}
          className="gap-1.5"
          icon={<Send className="h-4 w-4" />}
          label={t('tavern.send')}
        />
      </div>
    </form>
  )
}
