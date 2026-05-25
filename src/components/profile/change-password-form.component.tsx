'use client'

import LoaderButton from '@/common/loader-button.component'
import TextInput from '@/forms/text-input.component'
import { authClient } from '@/lib/auth.lib'
import { changePasswordSchema, type ChangePasswordType } from '@/shared/schemas/auth.schemas'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export default function ChangePasswordForm() {
  const { t } = useTranslation()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid, isDirty, isSubmitting }
  } = useForm<ChangePasswordType>({
    resolver: standardSchemaResolver(changePasswordSchema),
    mode: 'onSubmit',
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' }
  })

  const onSubmit = async (data: ChangePasswordType) => {
    const { error } = await authClient.changePassword({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
      revokeOtherSessions: true
    })
    if (error) {
      toast.error(t('profile.password.error'), { description: error.message })
      return
    }
    toast.success(t('profile.password.success'))
    reset({ currentPassword: '', newPassword: '', confirmPassword: '' })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <TextInput
        type="password"
        label={t('profile.password.current_label')}
        autoComplete="current-password"
        disabled={isSubmitting}
        {...register('currentPassword')}
        {...(errors.currentPassword?.message && {
          errorMessage: t(errors.currentPassword.message)
        })}
      />
      <TextInput
        type="password"
        label={t('profile.password.new_label')}
        autoComplete="new-password"
        disabled={isSubmitting}
        {...register('newPassword')}
        {...(errors.newPassword?.message && {
          errorMessage: t(errors.newPassword.message)
        })}
      />
      <TextInput
        type="password"
        label={t('profile.password.confirm_label')}
        autoComplete="new-password"
        disabled={isSubmitting}
        {...register('confirmPassword')}
        {...(errors.confirmPassword?.message && {
          errorMessage: t(errors.confirmPassword.message)
        })}
      />
      <div>
        <LoaderButton
          type="submit"
          isLoading={isSubmitting}
          disabled={!isValid || !isDirty}
          variant="outline"
          className="cursor-pointer"
          label={t('profile.password.submit')}
        />
      </div>
    </form>
  )
}
