'use client'
import Link from '@/common/link.component'
import LoaderButton from '@/common/loader-button.component'
import TextInput from '@/forms/text-input.component'
import { authClient } from '@/lib/auth.lib'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { signUpSchema, type SignUpType } from '@shared/schemas/auth.schemas'
import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import GoogleLoginButton from '../_components/google-login-button.component'

export default function SignUp() {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty }
  } = useForm<SignUpType>({
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
    resolver: standardSchemaResolver(signUpSchema),
    mode: 'onTouched'
  })

  const onSubmit = useCallback(
    async (data: SignUpType) => {
      setIsLoading(true)
      try {
        const result = await authClient.signUp.email({
          email: data.email,
          password: data.password,
          name: data.name,
          callbackURL: '/objectives?tutorial=true'
        })
        if (result.error) {
          const description =
            result.error.status === 400
              ? (result.error.message ?? t('sign_up.error.internal_error'))
              : t('sign_up.error.internal_error')
          toast.error(t('sign_up.error.title'), { description })
          return
        }
        // With requireEmailVerification: true, signup returns success but no session.
        // The user must click the verification link before signing in.
        setSubmittedEmail(data.email)
      } catch {
        toast.error(t('sign_up.error.title'), { description: t('sign_up.error.internal_error') })
      } finally {
        setIsLoading(false)
      }
    },
    [t]
  )

  if (submittedEmail) {
    return (
      <div className="flex w-md flex-col gap-3 text-center">
        <h2>{t('sign_up.success.title')}</h2>
        <p className="text-muted-foreground">
          {t('sign_up.success.description', { email: submittedEmail })}
        </p>
        <p className="text-muted-foreground text-sm">{t('sign_up.success.spam_hint')}</p>
        <div className="flex flex-row justify-center gap-1 pt-2">
          <p>{t('sign_up.already_have_account')}</p>
          <Link href="/login">{t('sign_up.login')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-md flex-col gap-2.5">
      <h2>{t('sign_up.title')}</h2>
      <TextInput
        type="text"
        placeholder={t('sign_up.name')}
        {...register('name')}
        {...(errors.name?.message && { errorMessage: t(errors.name.message) })}
        required
      />
      <TextInput
        type="email"
        placeholder={t('sign_up.email')}
        {...register('email')}
        {...(errors.email?.message && { errorMessage: t(errors.email.message) })}
        required
      />
      <TextInput
        type="password"
        placeholder={t('sign_up.password')}
        {...register('password')}
        {...(errors.password?.message && { errorMessage: t(errors.password.message) })}
        required
      />
      <TextInput
        type="password"
        placeholder={t('sign_up.confirm_password')}
        {...register('confirmPassword')}
        {...(errors.confirmPassword?.message && { errorMessage: t(errors.confirmPassword.message) })}
        required
      />
      <LoaderButton
        disabled={!isValid || !isDirty}
        isLoading={isLoading}
        label={t('sign_up.button')}
        onClick={handleSubmit(onSubmit)}
      />
      <div className="relative flex items-center gap-2 py-2">
        <div className="bg-border h-px w-full" />
        <span className="text-muted-foreground text-xs uppercase">{t('login.or')}</span>
        <div className="bg-border h-px w-full" />
      </div>
      <GoogleLoginButton />
      <div className="flex flex-row gap-1">
        <p>{t('sign_up.already_have_account')}</p>
        <Link href="/login">{t('sign_up.login')}</Link>
      </div>
    </div>
  )
}
