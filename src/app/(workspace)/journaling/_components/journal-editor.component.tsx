'use client'

import { MOODS } from '@shared/constants/journal.constants'
import Button from '@/components/ui/button.component'
import TiptapEditor from '@/components/ui/tiptap-editor.component'
import Select, {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

function getRandomPrompt(t: (key: string) => string) {
  const index = Math.floor(Math.random() * 5)
  return t(`journaling.prompt.${index}`)
}

const TIMEZONE_OFFSET = new Date().getTimezoneOffset()

export default function JournalEditor() {
  const { t } = useTranslation()
  const [content, setContent] = useState('')
  const [mood, setMood] = useState<string | undefined>(undefined)
  const [color, setColor] = useState<string | undefined>(undefined)

  const { data: streakData } = useSuspenseQuery(
    trpcOptions.journaling.getStreak.queryOptions({ timezoneOffset: TIMEZONE_OFFSET })
  )

  const createMutation = useMutation(
    trpcOptions.journaling.create.mutationOptions({
      onSuccess: async () => {
        toast.success(t('journaling.success.create'))
        setContent('')
        setMood(undefined)
        setColor(undefined)
        await queryClient.invalidateQueries({ queryKey: trpcOptions.journaling.getByDate.queryKey() })
        await queryClient.invalidateQueries({ queryKey: trpcOptions.journaling.getStreak.queryKey() })
        await queryClient.invalidateQueries({ queryKey: trpcOptions.journaling.getAll.queryKey() })
        await queryClient.invalidateQueries({ queryKey: trpcOptions.journaling.getMoodCalendar.queryKey() })
      },
      onError: (error) => toast.error(t('journaling.error.internal.create'), { description: error.message })
    })
  )

  const handleMoodChange = (value: string) => {
    const selected = MOODS.find((m) => m.id === value)
    setMood(value)
    setColor(selected?.color)
  }

  const handleSave = () => {
    const plain = content.replace(/<[^>]*>/g, '').trim()
    if (!plain) return
    createMutation.mutate({ content, mood, color, timezoneOffset: TIMEZONE_OFFSET })
  }

  const handlePrompt = () => {
    const prompt = getRandomPrompt(t)
    const htmlToInsert = `<p></p><p>${prompt}</p>`

    setContent((prev) => {
      if (!prev) return `<p>${prompt}</p>`
      return `${prev}${htmlToInsert}`
    })
  }

  const isLoading = createMutation.isPending
  const plainContent = content.replace(/<[^>]*>/g, '').trim()

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <TiptapEditor
          content={content}
          onChange={setContent}
          placeholder={t('journaling.placeholder')}
          disabled={isLoading}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {t('journaling.select_mood')}
        </p>
        <Select value={mood} onValueChange={handleMoodChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('journaling.select_mood')}>
              {mood && (
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color || MOODS.find((m) => m.id === mood)?.color }}
                  />
                  {t(`moods.${mood}`)}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {MOODS.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: m.color }}
                  />
                  {t(`moods.${m.id}`)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={handlePrompt} disabled={isLoading}>
          {t('journaling.need_prompt')}
        </Button>
        <div className="flex items-center gap-3">
          {streakData && streakData.streak > 0 && (
            <span className="text-muted-foreground text-sm font-medium">
              {t('journaling.streak', { count: streakData.streak })}
            </span>
          )}
          <Button onClick={handleSave} disabled={isLoading || !plainContent}>
            {t('journaling.save')}
          </Button>
        </div>
      </div>
    </div>
  )
}
