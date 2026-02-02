'use client'

import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { useMutation } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import { useForm, type DefaultValues, type FieldValues } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { z } from 'zod'

interface UseFormDialogOptions<TInput extends FieldValues, TOutput> {
  /** A Zod schema for form validation */
  schema: z.ZodSchema<TInput>
  defaultValues: DefaultValues<TInput>
  mutationFn: (data: TInput) => Promise<TOutput>
  onSuccess?: (data: TOutput) => void | Promise<void>
  onError?: (error: Error) => void
  successMessage?: string
  errorMessage?: string
}

/**
 * A reusable hook for form dialogs that combines:
 * - Dialog open state
 * - React Hook Form with schema validation
 * - tRPC mutation with success/error handling
 * - Form reset on close
 *
 * Note: Due to complex generic constraints between zod, standard-schema, and
 * react-hook-form, this hook uses explicit type assertions internally.
 *
 * @example
 * ```tsx
 * const { open, setOpen, form, handleSubmit, handleOpenChange, isPending, isSubmitDisabled } = useFormDialog({
 *   schema: createTaskSchema,
 *   defaultValues: { title: '', description: '' },
 *   mutationFn: (data) => trpc.tasks.create.mutate(data),
 *   onSuccess: () => invalidators.tasks(),
 *   successMessage: 'tasks.success.create',
 *   errorMessage: 'tasks.error.internal.create'
 * })
 * ```
 */
export function useFormDialog<TInput extends FieldValues, TOutput>({
  schema,
  defaultValues,
  mutationFn,
  onSuccess,
  onError,
  successMessage,
  errorMessage
}: UseFormDialogOptions<TInput, TOutput>) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  // Type assertion needed due to complex generic constraints between zod and standard-schema
  const form = useForm<TInput>({
    resolver: standardSchemaResolver(
      schema as Parameters<typeof standardSchemaResolver>[0]
    ) as ReturnType<typeof useForm<TInput>>['control']['_options']['resolver'],
    mode: 'onSubmit',
    defaultValues
  })

  const mutation = useMutation({
    mutationFn,
    onSuccess: async (data) => {
      if (successMessage) {
        toast.success(t(successMessage))
      }
      await onSuccess?.(data)
      setOpen(false)
    },
    onError: (error: Error) => {
      if (errorMessage) {
        toast.error(t(errorMessage), { description: error.message })
      }
      onError?.(error)
    }
  })

  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      form.reset()
    }
  }, [form])

  const handleSubmit = useCallback(async (e?: React.BaseSyntheticEvent) => {
    await form.handleSubmit((data) => mutation.mutate(data))(e)
  }, [form, mutation])

  const { isValid, isDirty } = form.formState

  return {
    open,
    setOpen,
    form,
    handleSubmit,
    handleOpenChange,
    isPending: mutation.isPending,
    isSubmitDisabled: !isValid || !isDirty
  }
}
