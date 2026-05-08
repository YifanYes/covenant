'use client'
import Link from '@/common/link.component'
import LoaderButton from '@/common/loader-button.component'
import TextInput from '@/forms/text-input.component'
import { authClient } from '@/lib/auth.lib'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { resetPasswordSchema, type ResetPasswordType } from '@shared/schemas/auth.schemas'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export default function ResetPassword() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty }
  } = useForm<ResetPasswordType>({
    defaultValues: { password: '', confirmPassword: '' },
    resolver: standardSchemaResolver(resetPasswordSchema),
    mode: 'onSubmit'
  })

  const onSubmit = useCallback(
    async (data: ResetPasswordType) => {
      if (!token) {
        toast.error(t('recover_password.error.title'), {
          description: t('recover_password.error.missing_token')
        })
        return
      }
      setIsLoading(true)
      try {
        const result = await authClient.resetPassword({
          newPassword: data.password,
          token
        })
        if (result.error) {
          toast.error(t('recover_password.error.title'), {
            description: result.error.message ?? t('recover_password.error.invalid_token')
          })
          return
        }
        toast.success(t('recover_password.success.title'))
        router.push('/login')
      } catch {
        toast.error(t('recover_password.error.title'), {
          description: t('recover_password.error.internal_error')
        })
      } finally {
        setIsLoading(false)
      }
    },
    [t, token, router]
  )

  if (!token) {
    return (
      <div className="flex w-md flex-col gap-3 text-center">
        <h2>{t('recover_password.error.title')}</h2>
        <p className="text-muted-foreground">{t('recover_password.error.missing_token')}</p>
        <div className="flex flex-row justify-center gap-1 pt-2">
          <Link href="/forgot-password">{t('recover_password.request_new_link')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-md flex-col gap-2.5">
      <h2>{t('recover_password.title')}</h2>
      <p className="text-muted-foreground text-sm">{t('recover_password.description')}</p>
      <TextInput
        type="password"
        placeholder={t('recover_password.password')}
        {...register('password')}
        {...(errors.password?.message && { errorMessage: t(errors.password.message) })}
        required
      />
      <TextInput
        type="password"
        placeholder={t('recover_password.confirm_password')}
        {...register('confirmPassword')}
        {...(errors.confirmPassword?.message && { errorMessage: t(errors.confirmPassword.message) })}
        required
      />
      <LoaderButton
        disabled={!isValid || !isDirty}
        isLoading={isLoading}
        label={t('recover_password.button')}
        onClick={handleSubmit(onSubmit)}
      />
      <div className="flex flex-row justify-center gap-1 pt-2">
        <Link href="/login">{t('recover_password.back_to_login')}</Link>
      </div>
    </div>
  )
}
