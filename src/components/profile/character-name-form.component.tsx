'use client'

import LoaderButton from '@/common/loader-button.component'
import TextInput from '@/forms/text-input.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { updateProfileSchema, type UpdateProfileType } from '@/shared/schemas/auth.schemas'
import { useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface CharacterNameFormProps {
  initialName: string
}

export default function CharacterNameForm({ initialName }: CharacterNameFormProps) {
  const { t } = useTranslation()

  const mutation = useMutation(
    trpcOptions.auth.updateProfile.mutationOptions({
      onSuccess: async (_data, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: trpcOptions.auth.getProfile.queryKey() }),
          queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() })
        ])
        toast.success(t('settings.character_name_updated'))
        reset({ characterName: variables.characterName ?? initialName })
      },
      onError: () => toast.error(t('settings.character_name_error'))
    })
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid, isDirty }
  } = useForm<UpdateProfileType>({
    resolver: standardSchemaResolver(updateProfileSchema),
    mode: 'onSubmit',
    defaultValues: { characterName: initialName }
  })

  // Avoid clobbering an in-progress edit if the underlying query refetches.
  useEffect(() => {
    if (!isDirty) reset({ characterName: initialName })
  }, [initialName, isDirty, reset])

  const onSubmit = (data: UpdateProfileType) =>
    mutation.mutate({ characterName: data.characterName?.trim() })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <TextInput
        type="text"
        label={t('settings.character_name_label')}
        maxLength={255}
        disabled={mutation.isPending}
        {...register('characterName')}
        {...(errors.characterName?.message && {
          errorMessage: t(errors.characterName.message)
        })}
      />
      <div>
        <LoaderButton
          type="submit"
          isLoading={mutation.isPending}
          disabled={!isValid || !isDirty}
          variant="outline"
          className="cursor-pointer"
          label={t('save_changes')}
        />
      </div>
    </form>
  )
}
