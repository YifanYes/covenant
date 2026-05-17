'use client'

import BaseConfirmDialog from '@/components/common/base-confirm-dialog.component'
import BaseFormDialog from '@/components/common/base-form-dialog.component'
import Button from '@/components/ui/button.component'
import Select, { SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.component'
import TiptapEditor from '@/components/ui/tiptap-editor.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { MOODS } from '@shared/constants/journal.constants'
import { updateJournalEntrySchema, type UpdateJournalEntryType } from '@shared/schemas/journal.schemas'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

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

  const { control, handleSubmit, reset, setValue } = useForm<UpdateJournalEntryType>({
    resolver: standardSchemaResolver(updateJournalEntrySchema),
    mode: 'onSubmit',
    defaultValues: {
      id: entry.id,
      content: entry.content,
      mood: entry.mood || undefined,
      color: entry.color || undefined
    }
  })

  useEffect(() => {
    if (open) {
      reset({
        id: entry.id,
        content: entry.content,
        mood: entry.mood || undefined,
        color: entry.color || undefined
      })
    }
  }, [open, entry, reset])

  const content = useWatch({ control, name: 'content' }) ?? ''
  const mood = useWatch({ control, name: 'mood' })
  const color = useWatch({ control, name: 'color' })
  const plainContent = content.replace(/<[^>]*>/g, '').trim()

  const handleMoodChange = (value: string) => {
    const selected = MOODS.find((m) => m.id === value)
    setValue('mood', value, { shouldDirty: true })
    setValue('color', selected?.color, { shouldDirty: true })
  }

  const onSubmit = (data: UpdateJournalEntryType) => {
    if (!plainContent) return
    updateMutation.mutate(data)
  }

  const isLoading = updateMutation.isPending

  return (
    <>
      <BaseFormDialog
        open={open}
        onOpenChange={onOpenChange}
        title="journaling.edit_entry"
        onSubmit={handleSubmit(onSubmit)}
        submitLabel="journaling.update"
        isLoading={isLoading}
        isSubmitDisabled={!plainContent}
        className="sm:max-w-4xl"
        extraFooterActions={
          <Button
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteMutation.isPending || isLoading}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/40 mr-auto"
          >
            {t('journaling.delete.button')}
          </Button>
        }
      >
        <div className="flex flex-col gap-5">
          <Controller
            name="content"
            control={control}
            render={({ field }) => (
              <TiptapEditor
                content={field.value ?? ''}
                onChange={field.onChange}
                placeholder={t('journaling.placeholder')}
                disabled={isLoading}
                className="max-h-[50vh] min-h-70"
              />
            )}
          />

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
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                      {t(`moods.${m.id}`)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </BaseFormDialog>

      <BaseConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={t('journaling.delete.title')}
        description={t('journaling.delete.description')}
        confirmLabel={t('journaling.delete.button')}
        onConfirm={() => deleteMutation.mutate({ id: entry.id })}
        isLoading={deleteMutation.isPending}
      />
    </>
  )
}
