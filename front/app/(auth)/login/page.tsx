'use client'
import Link from '@/common/link.component'
import LoaderButton from '@/common/loader-button.component'
import TextInput from '@/forms/text-input.component'
import { authClient, useSession } from '@/lib/auth.lib'
import { useAuthStore } from '@/stores/auth.store'
import AlertComponent, { AlertDescription, AlertTitle } from '@/ui/alert.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Alert, Check, Loader, Mail } from '@nsmr/pixelart-react'
import { loginSchema, type LoginType } from '@shared/schemas/auth.schemas'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import GoogleLoginButton from '../_components/google-login-button.component'

export default function Login() {
  const { t } = useTranslation()
  const updateUserInfo = useAuthStore((state) => state.updateUserInfo)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null)
  const redirectLinkRef = useRef<HTMLAnchorElement>(null)

  const { data: session, isPending: isSessionPending, error: sessionError } = useSession()

  // DEBUG: Remove after fixing
  console.log('[Login Debug]', { session, isSessionPending, sessionError, isRedirecting })

  // Handle session changes - redirect when logged in
  useEffect(() => {
    if (session?.user && !isRedirecting) {
      console.log('[Login] Session detected, starting redirect...')
      setIsRedirecting(true)

      updateUserInfo({
        email: session.user.email || '',
        userId: session.user.id
      })

      const redirectTo = searchParams.get('redirect_to')

      if (redirectTo && redirectTo !== '/login') {
        console.log('[Login] Redirecting to:', redirectTo)
        setRedirectTarget(redirectTo)
      } else {
        console.log('[Login] No redirect_to, checking character...')
        queryClient
          .fetchQuery(trpcOptions.character.hasCharacter.queryOptions())
          .then(({ hasCharacter }) => {
            const target = hasCharacter ? '/dashboard' : '/onboarding'
            console.log('[Login] Character check done, redirecting to:', target)
            setRedirectTarget(target)
          })
          .catch((err) => {
            console.error('[Login] Character check failed:', err)
            setRedirectTarget('/dashboard')
          })
      }
    }
  }, [session, updateUserInfo, searchParams, isRedirecting])

  // When redirectTarget is set, click the hidden link
  useEffect(() => {
    if (redirectTarget && redirectLinkRef.current) {
      console.log('[Login] Clicking hidden link to:', redirectTarget)
      redirectLinkRef.current.click()
    }
  }, [redirectTarget])

  // Check for error in URL params (from magic link failure)
  const urlError = useMemo(() => {
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    return error && errorDescription ? errorDescription.replace(/\+/g, ' ') : null
  }, [searchParams])

  // Clean up URL if there was an error
  useEffect(() => {
    if (urlError) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [urlError])

  const onSubmit = useCallback(
    async (data: LoginType) => {
      setIsLoading(true)
      try {
        const redirectTo = searchParams.get('redirect_to') || '/login'
        await authClient.signIn.magicLink({
          email: data.email,
          callbackURL: `${window.location.origin}${redirectTo}`
        })
        setMagicLinkSent(true)
        toast.success(t('login.success'))
      } catch (error) {
        toast.error(t('login.error.title'), {
          description: error instanceof Error ? error.message : 'Unknown error'
        })
      } finally {
        setIsLoading(false)
      }
    },
    [searchParams, t]
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty }
  } = useForm<LoginType>({
    defaultValues: { email: '' },
    resolver: standardSchemaResolver(loginSchema),
    mode: 'onSubmit'
  })

  const isAccountVerified = useMemo(
    () => searchParams.get('verified') === 'true' || searchParams.get('type') === 'signup',
    [searchParams]
  )

  // Use null as initial value to match SSR, then set random value after mount
  const [randomQuoteIndex, setRandomQuoteIndex] = useState<number | null>(null)

  useEffect(() => {
    setRandomQuoteIndex(Math.random())
  }, [])

  const verifyingMessage = useMemo(() => {
    const messages = t('login.verifying_messages', { returnObjects: true }) as string[]
    // Only show random message if randomQuoteIndex has been set (after mount)
    if (Array.isArray(messages) && messages.length > 0 && randomQuoteIndex !== null) {
      return messages[Math.floor(randomQuoteIndex * messages.length)]
    }
    return null
  }, [t, randomQuoteIndex])

  // Show loading while checking session or redirecting
  if (isSessionPending || isRedirecting) {
    return (
      <div className="flex w-md flex-col items-center justify-center gap-6 py-8">
        <Loader className="h-10 w-10 animate-spin" />
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-xl font-semibold">{t('login.verifying_title')}</h2>
          {verifyingMessage ? (
            <p className="text-muted-foreground text-sm">{verifyingMessage}</p>
          ) : (
            <div className="bg-muted h-4 w-48 animate-pulse rounded" />
          )}
        </div>
        {/* Hidden link for programmatic navigation */}
        {redirectTarget && <NextLink ref={redirectLinkRef} href={redirectTarget} className="hidden" replace />}
      </div>
    )
  }

  if (magicLinkSent) {
    return (
      <div className="flex w-md flex-col gap-2.5">
        <h2>{t('login.check_email_title')}</h2>
        <AlertComponent variant="success">
          <Mail />
          <AlertTitle>{t('login.magic_link_sent_title')}</AlertTitle>
          <AlertDescription>{t('login.magic_link_sent_description')}</AlertDescription>
        </AlertComponent>
      </div>
    )
  }

  return (
    <div className="flex w-md flex-col gap-2.5">
      <h2>{t('login.title')}</h2>
      {isAccountVerified && (
        <AlertComponent variant="success">
          <Check />
          <AlertTitle>{t('login.account_verified.title')}</AlertTitle>
          <AlertDescription>{t('login.account_verified.description')}</AlertDescription>
        </AlertComponent>
      )}
      {urlError && (
        <AlertComponent variant="destructive">
          <Alert />
          <AlertTitle>{t('login.error.magic_link_error')}</AlertTitle>
          <AlertDescription>
            {urlError === 'Email link is invalid or has expired' ? t('login.error.invalid_magic_link') : urlError}
          </AlertDescription>
        </AlertComponent>
      )}
      <TextInput
        type="email"
        placeholder={t('login.email')}
        {...register('email')}
        {...(errors.email?.message && { errorMessage: t(errors.email.message) })}
        required
      />
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
