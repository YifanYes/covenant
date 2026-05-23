'use client'

import BaseConfirmDialog from '@/common/base-confirm-dialog.component'
import BaseFormDialog from '@/common/base-form-dialog.component'
import ColorSelector from '@/forms/color-selector.component'
import TextInput from '@/forms/text-input.component'
import { cn } from '@/lib/cn.lib'
import { colorOptions } from '@/types/colors.types'
import Button from '@/ui/button.component'
import Input from '@/ui/input.component'
import Popover, { PopoverContent, PopoverTrigger } from '@/ui/popover.component'
import Tooltip, { TooltipContent, TooltipTrigger } from '@/ui/tooltip.component'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Delete, Lock, Plus } from 'pixelarticons/react'
import { useState } from 'react'
import { Controller, useFieldArray, useForm, type Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  createUserTaskStatusSchema,
  isProtectedLabel,
  type CreateUserTaskStatusBodyType
} from '@shared/schemas/user-task-statuses.schemas'
import type { TasksSettingsFormValues } from '../_schemas/tasks-settings.schemas'

function ColorSwatch({ color, className }: { color: string | null; className?: string }) {
  const styles = colorOptions.find((o) => o.color === color)?.styles
  return (
    <span
      className={cn(
        'inline-block h-4 w-4 shrink-0 rounded-full',
        styles ?? 'border-muted-foreground/40 border-2 border-dashed',
        className
      )}
      aria-hidden
    />
  )
}

function ColorSwatchPicker({
  value,
  onChange,
  ariaLabel
}: {
  value: string | null
  onChange: (next: string) => void
  ariaLabel: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={ariaLabel}
        className="hover:bg-accent flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-colors"
      >
        <ColorSwatch color={value} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <div className="grid grid-cols-5 gap-1.5">
          {colorOptions.map((opt) => (
            <button
              key={opt.color}
              type="button"
              onClick={() => {
                onChange(opt.color)
                setOpen(false)
              }}
              className={cn(
                'flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110',
                value === opt.color && 'ring-foreground ring-2 ring-offset-2 ring-offset-transparent'
              )}
              aria-label={opt.color}
            >
              <ColorSwatch color={opt.color} className="h-5 w-5" />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function StatusRow({
  index,
  control,
  isLocked,
  canDelete,
  onDelete
}: {
  index: number
  control: Control<TasksSettingsFormValues>
  isLocked: boolean
  canDelete: boolean
  onDelete: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="group hover:bg-accent/30 flex items-center gap-2 rounded-md py-1.5 pr-1 pl-2 transition-colors">
      <Controller
        name={`statuses.${index}.color` as const}
        control={control}
        render={({ field }) => (
          <ColorSwatchPicker
            value={field.value}
            ariaLabel={t('task_status_settings.color_label')}
            onChange={(next) => field.onChange(next)}
          />
        )}
      />
      <Controller
        name={`statuses.${index}.label` as const}
        control={control}
        render={({ field }) => (
          <Input
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            disabled={isLocked}
            placeholder={t('task_status_settings.label_placeholder')}
            className="border-transparent bg-transparent shadow-none focus-visible:border-input focus-visible:bg-background"
          />
        )}
      />
      {isLocked ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              aria-label={t('task_status_settings.protected_locked')}
              className="text-muted-foreground inline-flex h-8 w-8 items-center justify-center"
            >
              <Lock className="h-4 w-4" />
            </span>
          </TooltipTrigger>
          <TooltipContent>{t('task_status_settings.protected_locked')}</TooltipContent>
        </Tooltip>
      ) : canDelete ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          onClick={onDelete}
          aria-label={t('task_status_settings.delete_aria')}
        >
          <Delete className="h-4 w-4" />
        </Button>
      ) : (
        <span className="h-8 w-8" aria-hidden />
      )}
    </div>
  )
}

function AddStatusDialog({
  existingLabels,
  onAdd
}: {
  existingLabels: string[]
  onAdd: (label: string, color: string | null) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isValid }
  } = useForm<CreateUserTaskStatusBodyType>({
    resolver: standardSchemaResolver(createUserTaskStatusSchema),
    mode: 'onSubmit',
    defaultValues: { label: '', color: '' }
  })

  const validateAndSubmit = handleSubmit((data) => {
    const label = data.label.trim()
    if (isProtectedLabel(label)) {
      setError('label', { type: 'manual', message: 'errors.task_status.label_reserved' })
      return
    }
    if (existingLabels.some((l) => l.trim().toLowerCase() === label.toLowerCase())) {
      setError('label', { type: 'manual', message: 'errors.task_status.label_collision' })
      return
    }
    onAdd(label, data.color ?? null)
    setOpen(false)
    reset()
  })

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
      title="task_status_settings.add_title"
      onSubmit={validateAndSubmit}
      submitLabel="task_status_settings.add"
      isSubmitDisabled={!isValid}
      trigger={
        <Button variant="outline" size="sm" type="button">
          <Plus className="mr-2 h-4 w-4" />
          {t('task_status_settings.add')}
        </Button>
      }
    >
      <div className="grid gap-4">
        <TextInput
          placeholder={t('task_status_settings.label_placeholder')}
          {...register('label')}
          {...(errors.label?.message && { errorMessage: t(errors.label.message.toString()) })}
        />
        <Controller
          name="color"
          control={control}
          render={({ field }) => (
            <ColorSelector
              label={t('task_status_settings.color_label')}
              placeholder={t('task_status_settings.color_placeholder')}
              value={field.value ?? undefined}
              onChange={field.onChange}
            />
          )}
        />
      </div>
    </BaseFormDialog>
  )
}

function DeleteStatusDialog({
  label,
  defaultLabel,
  onConfirm,
  onClose
}: {
  label: string
  defaultLabel: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <BaseConfirmDialog
      open
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      titleKey="task_status_settings.delete_confirm_title"
      descriptionKey="task_status_settings.delete_confirm_description"
      descriptionValues={{ label, defaultLabel }}
      confirmLabelKey="delete"
      onConfirm={() => {
        onConfirm()
        onClose()
      }}
    />
  )
}

export default function TaskStatusesSection({
  control,
  errorMessage
}: {
  control: Control<TasksSettingsFormValues>
  errorMessage?: string
}) {
  const { t } = useTranslation()
  const { fields, append, remove } = useFieldArray({ control, name: 'statuses' })
  const [pendingDelete, setPendingDelete] = useState<{ index: number; label: string } | null>(null)

  const defaultLabel = fields.find((f) => f.isDefault)?.label ?? fields[0]?.label ?? ''
  const totalCount = fields.length
  const existingLabels = fields.map((f) => f.label)

  return (
    <section className="flex flex-col gap-4 lg:col-span-2">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold tracking-tight">{t('task_status_settings.title')}</h3>
        <p className="text-muted-foreground text-sm">{t('task_status_settings.description')}</p>
      </div>
      <div className="border-foreground/10 flex flex-col gap-0.5 rounded-md border p-1">
        {fields.map((field, index) => {
          const isLocked = isProtectedLabel(field.label)
          const canDelete = !isLocked && totalCount > 1
          return (
            <StatusRow
              key={field.id}
              index={index}
              control={control}
              isLocked={isLocked}
              canDelete={canDelete}
              onDelete={() => setPendingDelete({ index, label: field.label })}
            />
          )
        })}
      </div>
      {errorMessage && (
        <p className="text-destructive text-sm" role="alert">
          {t(errorMessage, { defaultValue: errorMessage })}
        </p>
      )}
      <div>
        <AddStatusDialog
          existingLabels={existingLabels}
          onAdd={(label, color) =>
            append({ id: crypto.randomUUID(), label, color, isDefault: false, isNew: true })
          }
        />
      </div>
      {pendingDelete && (
        <DeleteStatusDialog
          label={pendingDelete.label}
          defaultLabel={defaultLabel}
          onConfirm={() => remove(pendingDelete.index)}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </section>
  )
}
