'use client'
import Link from '@/common/link.component'
import LoaderButton from '@/common/loader-button.component'
import TextInput from '@/forms/text-input.component'
import { authClient } from '@/lib/auth.lib'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { forgotPasswordSchema, type ForgotPasswordType } from '@shared/schemas/auth.schemas'
import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export default function ForgotPassword() {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty }
  } = useForm<ForgotPasswordType>({
    defaultValues: { email: '' },
    resolver: standardSchemaResolver(forgotPasswordSchema),
    mode: 'onSubmit'
  })

  const onSubmit = useCallback(
    async (data: ForgotPasswordType) => {
      setIsLoading(true)
      try {
        // Better Auth's request-password-reset endpoint always returns 200 — it doesn't
        // reveal whether the email exists. We surface the same "check your email" state in
        // both branches to avoid leaking enumeration via the UI.
        await authClient.requestPasswordReset({
          email: data.email,
          redirectTo: '/reset-password'
        })
        setSubmittedEmail(data.email)
      } catch {
        toast.error(t('forgot_password.error.title'), {
          description: t('forgot_password.error.internal_error')
        })
      } finally {
        setIsLoading(false)
      }
    },
    [t]
  )

  if (submittedEmail) {
    return (
      <div className="flex w-md flex-col gap-3 text-center">
        <h2>{t('forgot_password.success.title')}</h2>
        <p className="text-muted-foreground">
          {t('forgot_password.success.description', { email: submittedEmail })}
        </p>
        <p className="text-muted-foreground text-sm">{t('forgot_password.success.spam_hint')}</p>
        <div className="flex flex-row justify-center gap-1 pt-2">
          <Link href="/login">{t('forgot_password.back_to_login')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-md flex-col gap-2.5">
      <h2>{t('forgot_password.title')}</h2>
      <p className="text-muted-foreground text-sm">{t('forgot_password.description')}</p>
      <TextInput
        type="email"
        placeholder={t('forgot_password.email')}
        {...register('email')}
        {...(errors.email?.message && { errorMessage: t(errors.email.message) })}
        required
      />
      <LoaderButton
        disabled={!isValid || !isDirty}
        isLoading={isLoading}
        label={t('forgot_password.button')}
        onClick={handleSubmit(onSubmit)}
      />
      <div className="flex flex-row justify-center gap-1 pt-2">
        <Link href="/login">{t('forgot_password.back_to_login')}</Link>
      </div>
    </div>
  )
}
