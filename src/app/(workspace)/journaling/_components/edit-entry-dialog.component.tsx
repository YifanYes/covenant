'use client'

import { MOODS } from '@shared/constants/journal.constants'
import LoaderButton from '@/common/loader-button.component'
import Button from '@/components/ui/button.component'
import Dialog, {
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog.component'
import TiptapEditor from '@/components/ui/tiptap-editor.component'
import Select, {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import BaseConfirmDialog from '@/components/common/base-confirm-dialog.component'

interface EditEntryDialogProps {
  entry: {
    id: string
    content: string
    mood: string | null
    color: string | null
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function EditEntryDialog({ entry, open, onOpenChange }: EditEntryDialogProps) {
  const { t } = useTranslation()
  const [content, setContent] = useState(entry.content)
  const [mood, setMood] = useState<string | undefined>(entry.mood || undefined)
  const [color, setColor] = useState<string | undefined>(entry.color || undefined)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const updateMutation = useMutation(
    trpcOptions.journaling.update.mutationOptions({
      onSuccess: async () => {
        toast.success(t('journaling.success.update'))
        await queryClient.invalidateQueries({ queryKey: trpcOptions.journaling.getByDate.queryKey() })
        await queryClient.invalidateQueries({ queryKey: trpcOptions.journaling.getStreak.queryKey() })
        await queryClient.invalidateQueries({ queryKey: trpcOptions.journaling.getAll.queryKey() })
        await queryClient.invalidateQueries({ queryKey: trpcOptions.journaling.getMoodCalendar.queryKey() })
        onOpenChange(false)
      },
      onError: (error) => toast.error(t('journaling.error.internal.update'), { description: error.message })
    })
  )

  const deleteMutation = useMutation(
    trpcOptions.journaling.delete.mutationOptions({
      onSuccess: async () => {
        toast.success(t('journaling.success.delete'))
        await queryClient.invalidateQueries({ queryKey: trpcOptions.journaling.getByDate.queryKey() })
        await queryClient.invalidateQueries({ queryKey: trpcOptions.journaling.getStreak.queryKey() })
        await queryClient.invalidateQueries({ queryKey: trpcOptions.journaling.getAll.queryKey() })
        await queryClient.invalidateQueries({ queryKey: trpcOptions.journaling.getMoodCalendar.queryKey() })
        setShowDeleteConfirm(false)
        onOpenChange(false)
      },
      onError: (error) => toast.error(t('journaling.error.internal.delete'), { description: error.message })
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
    updateMutation.mutate({ id: entry.id, content, mood, color })
  }

  const isLoading = updateMutation.isPending
  const plainContent = content.replace(/<[^>]*>/g, '').trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('journaling.edit_entry')}</DialogTitle>
        </DialogHeader>
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

          <div className="flex items-center justify-between gap-3">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleteMutation.isPending || isLoading}
            >
              {t('journaling.delete.button')}
            </Button>
            <LoaderButton
              onClick={handleSave}
              isLoading={isLoading}
              disabled={!plainContent}
              label={t('journaling.update')}
            />
          </div>
        </div>
      </DialogContent>

      <BaseConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={t('journaling.delete.title')}
        description={t('journaling.delete.description')}
        confirmLabel={t('journaling.delete.button')}
        onConfirm={() => deleteMutation.mutate({ id: entry.id })}
        isLoading={deleteMutation.isPending}
      />
    </Dialog>
  )
}
