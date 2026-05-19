'use client'

import LoaderButton from '@/common/loader-button.component'
import { panelChrome } from '@/components/rpg/rpg-styles'
import { cn } from '@/lib/cn.lib'
import Textarea from '@/ui/textarea.component'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Send } from 'pixelarticons/react'
import { type KeyboardEvent } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

interface MessageComposerProps {
  placeholder: string
  sendLabel: string
  maxLength: number
  warnRemaining: number
  dangerRemaining: number
  onSubmit: (content: string) => Promise<unknown> | void
  isPending: boolean
  formatCount: (length: number, max: number) => string
}

interface ContentForm {
  content: string
}

export default function MessageComposer({
  placeholder,
  sendLabel,
  maxLength,
  warnRemaining,
  dangerRemaining,
  onSubmit,
  isPending,
  formatCount
}: MessageComposerProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isValid }
  } = useForm<ContentForm>({
    resolver: standardSchemaResolver(z.object({ content: z.string().trim().min(1).max(maxLength) })),
    mode: 'onChange',
    defaultValues: { content: '' }
  })

  const content = useWatch({ control, name: 'content' }) ?? ''
  const remaining = maxLength - content.length

  const submit = handleSubmit(async (data) => {
    if (isPending) return
    try {
      await onSubmit(data.content)
      reset({ content: '' })
    } catch {
      // preserve content on failure; parent handles error surfacing
    }
  })

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  const tone =
    remaining < dangerRemaining
      ? 'text-destructive'
      : remaining < warnRemaining
        ? 'text-amber-400'
        : 'text-muted-foreground/60'

  return (
    <form onSubmit={submit} className={cn(panelChrome, 'p-2 focus-within:border-accent/50 transition')}>
      <Textarea
        {...register('content')}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="resize-none min-h-12 border-0 bg-transparent shadow-none focus-visible:ring-0 px-2"
        maxLength={maxLength}
      />
      <div className="flex items-center justify-between pl-2 pr-1 pt-1">
        <span className={cn('text-[11px] tabular-nums', tone)}>
          {formatCount(content.length, maxLength)}
        </span>
        <LoaderButton
          type="submit"
          size="sm"
          isLoading={isPending}
          disabled={!isValid}
          className="gap-1.5"
          icon={<Send className="h-4 w-4" />}
          label={sendLabel}
        />
      </div>
    </form>
  )
}
