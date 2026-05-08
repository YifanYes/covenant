'use client'
import Link from '@/common/link.component'
import LoaderButton from '@/common/loader-button.component'
import TextInput from '@/forms/text-input.component'
import { authClient, useSession } from '@/lib/auth.lib'
import { useAuthStore } from '@/stores/auth.store'
import AlertComponent, { AlertDescription, AlertTitle } from '@/ui/alert.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { loginSchema, type LoginType } from '@shared/schemas/auth.schemas'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader, SquareAlert } from 'pixelarticons/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import GoogleLoginButton from '../_components/google-login-button.component'

export default function Login() {
  const { t } = useTranslation()
  const updateUserInfo = useAuthStore((state) => state.updateUserInfo)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const { data: session, isPending: isSessionPending } = useSession()

  useEffect(() => {
    if (session?.user && !isRedirecting) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time redirect guard: prevents double-execution when session resolves
      setIsRedirecting(true)

      updateUserInfo({
        email: session.user.email || '',
        userId: session.user.id
      })

      const redirectTo = searchParams.get('redirect_to')
      const isSafeRedirect = (v: string) => v.startsWith('/') && !v.startsWith('//')

      if (redirectTo && isSafeRedirect(redirectTo)) {
        router.push(redirectTo)
      } else {
        queryClient
          .fetchQuery(trpcOptions.character.hasCharacter.queryOptions())
          .then(({ hasCharacter }) => {
            router.push(hasCharacter ? '/dashboard' : '/onboarding')
          })
          .catch(() => {
            router.push('/dashboard')
          })
      }
    }
  }, [session, updateUserInfo, router, searchParams, isRedirecting])

  const urlError = useMemo(() => {
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    return error && errorDescription ? decodeURIComponent(errorDescription.replace(/\+/g, ' ')) : null
  }, [searchParams])

  useEffect(() => {
    if (urlError) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [urlError])

  const onSubmit = useCallback(
    async (data: LoginType) => {
      setIsLoading(true)
      try {
        const result = await authClient.signIn.email({ email: data.email, password: data.password })
        if (result.error) {
          const isUnverified = result.error.code === 'EMAIL_NOT_VERIFIED'
          const description = isUnverified
            ? t('login.error.email_not_verified')
            : result.error.status === 401
              ? t('login.error.invalid_credentials')
              : t('login.error.internal_error')
          toast.error(t('login.error.title'), { description })
          return
        }
      } catch {
        toast.error(t('login.error.title'), { description: t('login.error.internal_error') })
      } finally {
        setIsLoading(false)
      }
    },
    [t]
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty }
  } = useForm<LoginType>({
    defaultValues: { email: '', password: '' },
    resolver: standardSchemaResolver(loginSchema),
    mode: 'onSubmit'
  })

  const [verifyingMessage, setVerifyingMessage] = useState(() => t('login.verifying_title'))

  useEffect(() => {
    const messages = t('login.verifying_messages', { returnObjects: true }) as string[]
    if (Array.isArray(messages) && messages.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- loading message initialization from translations, guarded by array check
      setVerifyingMessage(messages[Math.floor(Math.random() * messages.length)])
    }
  }, [t])

  if (isSessionPending || isRedirecting) {
    return (
      <div className="flex w-md flex-col items-center justify-center gap-6 py-8">
        <Loader className="h-10 w-10 animate-spin" />
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-xl font-semibold">{t('login.verifying_title')}</h2>
          <p className="text-muted-foreground text-sm">{verifyingMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-md flex-col gap-2.5">
      <h2>{t('login.title')}</h2>
      {urlError && (
        <AlertComponent variant="destructive">
          <SquareAlert />
          <AlertTitle>{t('login.error.title')}</AlertTitle>
          <AlertDescription>{urlError}</AlertDescription>
        </AlertComponent>
      )}
      <TextInput
        type="email"
        placeholder={t('login.email')}
        {...register('email')}
        {...(errors.email?.message && { errorMessage: t(errors.email.message) })}
        required
      />
      <TextInput
        type="password"
        placeholder={t('login.password')}
        {...register('password')}
        {...(errors.password?.message && { errorMessage: t(errors.password.message) })}
        required
      />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-muted-foreground text-sm">
          {t('login.recover_password')}
        </Link>
      </div>
      <LoaderButton
        disabled={!isValid || !isDirty}
        isLoading={isLoading}
        label={t('login.button')}
        onClick={handleSubmit(onSubmit)}
      />
      <div className="relative flex items-center gap-2 py-2">
        <div className="bg-border h-px w-full" />
        <span className="text-muted-foreground text-xs uppercase">{t('login.or')}</span>
        <div className="bg-border h-px w-full" />
      </div>
      <GoogleLoginButton />
      <div className="flex flex-row gap-1">
        <p>{t('login.dont_have_account')}</p>
        <Link href="/sign-up">{t('login.create_account')}</Link>
      </div>
    </div>
  )
}
