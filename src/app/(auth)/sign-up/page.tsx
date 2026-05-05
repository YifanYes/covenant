'use client'
import Link from '@/common/link.component'
import LoaderButton from '@/common/loader-button.component'
import TextInput from '@/forms/text-input.component'
import { authClient } from '@/lib/auth.lib'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { MailOpen as MailCheck } from 'pixelarticons/react'
import { signUpSchema, type SignUpType } from '@shared/schemas/auth.schemas'
import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import GoogleLoginButton from '../_components/google-login-button.component'

export default function SignUp() {
  const { t } = useTranslation()

  const [isSigned, setIsSigned] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty }
  } = useForm<SignUpType>({ resolver: standardSchemaResolver(signUpSchema), mode: 'onSubmit' })

  const onSubmit = useCallback(
    async (data: SignUpType) => {
      setIsLoading(true)
      try {
        await authClient.signIn.magicLink({
          email: data.email,
          callbackURL: `${window.location.origin}/onboarding`
        })
        setIsSigned(true)
      } catch (error) {
        toast.error(t('sign_up.error.title'), {
          description: error instanceof Error ? error.message : 'Unknown error'
        })
      } finally {
        setIsLoading(false)
      }
    },
    [t]
  )

  return (
    <div className="flex w-md flex-col gap-2.5">
      {isSigned ? (
        <>
          <div className="dark:bg-card rounded-lg border-2 border-green-300 bg-green-50 p-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full border-2 border-green-500 p-3 dark:border-green-400 dark:bg-green-200/10">
                <MailCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-green-800 dark:text-green-400">
                  {t('sign_up.success_title')}
                </h2>
                <p className="leading-relaxed text-green-700 dark:text-green-200">{t('sign_up.success_message')}</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <h2>{t('sign_up.title')}</h2>
          <TextInput
            type="email"
            placeholder={t('sign_up.email')}
            {...register('email')}
            {...(errors.email?.message && { errorMessage: t(errors.email.message) })}
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
        </>
      )}
    </div>
  )
}
