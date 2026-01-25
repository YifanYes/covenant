'use client'
import Link from '@/common/link.component'
import LoaderButton from '@/common/loader-button.component'
import TextInput from '@/forms/text-input.component'
import { createClient } from '@/lib/supabase.lib'
const supabase = createClient()
import { useAuthStore } from '@/stores/auth.store'
import AlertComponent, { AlertDescription, AlertTitle } from '@/ui/alert.component'
import { queryClient, trpc } from '@/utils/trpc.utils'
import GoogleLoginButton from '../_components/google-login-button.component'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Alert, Check, Loader, Mail } from '@nsmr/pixelart-react'
import { loginSchema, type LoginType } from '@shared/schemas/auth.schemas'
import { useMutation } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

export default function Login() {
  const { t } = useTranslation()
  const updateUserInfo = useAuthStore((state) => state.updateUserInfo)
  const router = useRouter()
  const [searchParams, setSearchParams] = useSearchParams()
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(() => {
    if (typeof window === 'undefined') return false
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    return params.has('access_token') && !params.has('error')
  })

  // Compute derived state from URL
  const urlState = useMemo(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.substring(1) : ''
    const hashParams = new URLSearchParams(hash)

    const error = hashParams.get('error')
    const errorDescription = hashParams.get('error_description')
    const hashType = hashParams.get('type')

    const magicLinkError = error && errorDescription ? errorDescription.replace(/\+/g, ' ') : null
    const hasError = Boolean(error && errorDescription)

    return {
      error,
      errorDescription,
      hashType,
      magicLinkError,
      hasError
    }
  }, [])

  const loginMutation = useMutation(
    trpc.auth.login.mutationOptions({
      onSuccess: () => {
        setMagicLinkSent(true)
        toast.success(t('login.success'))
      },
      onError: (error) => toast.error(t('login.error.title'), { description: error.message })
    })
  )

  const onSubmit = useCallback(
    (data: LoginType) => {
      loginMutation.mutate(data)
    },
    [loginMutation]
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

  // Clean up URL if there was an error in the hash
  useEffect(() => {
    if (urlState.hasError) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [urlState.hasError])

  // Handle verification redirect on mount
  useEffect(() => {
    const verified = searchParams.get('verified')
    const type = searchParams.get('type')
    const redirectTo = searchParams.get('redirect_to')

    const isVerified = verified === 'true' || type === 'signup' || urlState.hashType === 'signup'

    if (isVerified) {
      const newSearchParams = new URLSearchParams(searchParams)
      newSearchParams.delete('verified')
      newSearchParams.delete('type')
      newSearchParams.delete('redirect_to')
      setSearchParams(newSearchParams, { replace: true })

      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }

      const destination = redirectTo ? new URL(redirectTo).pathname : '/onboarding'
      router.push(destination)
    }
  }, [searchParams, setSearchParams, navigate, urlState.hashType])

  // Listen to Supabase auth state changes
  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const isSignInEvent = event === 'SIGNED_IN' || event === 'INITIAL_SESSION'
      if (isSignInEvent && session) {
        setIsVerifyingOTP(true)

        updateUserInfo({
          email: session.user.email || '',
          userId: session.user.id
        })

        window.history.replaceState(null, '', window.location.pathname)

        const redirectTo = searchParams.get('redirect_to')

        if (redirectTo) {
          router.push(redirectTo)
        } else {
          try {
            const { hasCharacter } = await queryClient.fetchQuery(trpc.character.hasCharacter.queryOptions())
            router.push(hasCharacter ? '/dashboard' : '/onboarding')
          } catch (error) {
            console.error('Failed to check character status:', error)
            router.push('/dashboard')
          }
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [updateUserInfo, navigate, searchParams])

  const isAccountVerified = useMemo(
    () =>
      searchParams.get('verified') === 'true' ||
      searchParams.get('type') === 'signup' ||
      urlState.hashType === 'signup',
    [searchParams, urlState.hashType]
  )

  const [randomQuoteIndex] = useState(() => Math.random())

  const verifyingMessage = useMemo(() => {
    const messages = t('login.verifying_messages', { returnObjects: true }) as string[]
    if (Array.isArray(messages) && messages.length > 0) {
      return messages[Math.floor(randomQuoteIndex * messages.length)]
    }
    return t('login.verifying_title')
  }, [t, randomQuoteIndex])

  if (isVerifyingOTP) {
    return (
      <div className='flex w-md flex-col items-center justify-center gap-6 py-8'>
        <Loader className='h-10 w-10 animate-spin' />
        <div className='flex flex-col items-center gap-2 text-center'>
          <h2 className='text-xl font-semibold'>{t('login.verifying_title')}</h2>
          <p className='text-muted-foreground text-sm'>{verifyingMessage}</p>
        </div>
      </div>
    )
  }

  if (magicLinkSent) {
    return (
      <div className='flex w-md flex-col gap-2.5'>
        <h2>{t('login.check_email_title')}</h2>
        <AlertComponent variant='success'>
          <Mail />
          <AlertTitle>{t('login.magic_link_sent_title')}</AlertTitle>
          <AlertDescription>{t('login.magic_link_sent_description')}</AlertDescription>
        </AlertComponent>
      </div>
    )
  }

  return (
    <div className='flex w-md flex-col gap-2.5'>
      <h2>{t('login.title')}</h2>
      {isAccountVerified && (
        <AlertComponent variant='success'>
          <Check />
          <AlertTitle>{t('login.account_verified.title')}</AlertTitle>
          <AlertDescription>{t('login.account_verified.description')}</AlertDescription>
        </AlertComponent>
      )}
      {urlState.magicLinkError && (
        <AlertComponent variant='destructive'>
          <Alert />
          <AlertTitle>{t('login.error.magic_link_error')}</AlertTitle>
          <AlertDescription>
            {urlState.magicLinkError === 'Email link is invalid or has expired'
              ? t('login.error.invalid_magic_link')
              : urlState.magicLinkError}
          </AlertDescription>
        </AlertComponent>
      )}
      <TextInput
        type='email'
        placeholder={t('login.email')}
        {...register('email')}
        {...(errors.email?.message && { errorMessage: t(errors.email.message) })}
        required
      />
      <LoaderButton
        disabled={!isValid || !isDirty}
        isLoading={loginMutation.isPending}
        label={t('login.button')}
        onClick={handleSubmit(onSubmit)}
      />
      <div className='relative flex items-center gap-2 py-2'>
        <div className='bg-border h-px w-full' />
        <span className='text-muted-foreground text-xs uppercase'>{t('login.or')}</span>
        <div className='bg-border h-px w-full' />
      </div>
      <GoogleLoginButton />
      <div className='flex flex-row gap-1'>
        <p>{t('login.dont_have_account')}</p>
        <Link href='/sign-up'>{t('login.create_account')}</Link>
      </div>
    </div>
  )
}
