import Link from '@/components/Link'
import LoaderButton from '@/components/LoaderButton'
import TextInput from '@/components/forms/TextInput'
import { Alert as AlertComponent, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useAuthStore } from '@/hooks/use-auth-store'
import { supabase } from '@/lib/supabase'
import { trpc } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Alert, Check, Mail } from '@nsmr/pixelart-react'
import { loginSchema, type LoginType } from '@shared/schemas/auth.schemas'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'

export default function Login() {
  const { t } = useTranslation()
  const { updateUserInfo } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false)

  const loginMutation = useMutation(
    trpc.auth.login.mutationOptions({
      onSuccess: () => {
        setMagicLinkSent(true)
        toast.success(t('login.success'))
      },
      onError: (error) => toast.error(t('login.error.title'), { description: error.message })
    })
  )

  const onSubmit = (data: LoginType) => {
    loginMutation.mutate(data)
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty }
  } = useForm<LoginType>({
    defaultValues: { email: '' },
    resolver: standardSchemaResolver(loginSchema),
    mode: 'onTouched'
  })

  // Parse hash and search params once during render to compute initial state
  const urlState = useMemo(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.substring(1) : ''
    const hashParams = new URLSearchParams(hash)

    const error = hashParams.get('error')
    const errorDescription = hashParams.get('error_description')
    const hashType = hashParams.get('type')

    // Compute derived state from URL
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
      navigate(destination)
    }
  }, [searchParams, setSearchParams, navigate, urlState.hashType])

  // Listen to Supabase auth state changes
  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setIsVerifyingOTP(true)

        updateUserInfo({
          email: session.user.email || '',
          userId: session.user.id
        })

        window.history.replaceState(null, '', window.location.pathname)

        const redirectTo = searchParams.get('redirect_to')
        const destination = redirectTo ? new URL(redirectTo).pathname : '/dashboard'
        navigate(destination)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [updateUserInfo, navigate, searchParams])

  // Compute display state from URL
  const isAccountVerified =
    searchParams.get('verified') === 'true' || searchParams.get('type') === 'signup' || urlState.hashType === 'signup'

  if (isVerifyingOTP) {
    return (
      <div className='flex w-md flex-col gap-2.5'>
        <h2>{t('login.verifying_title')}</h2>
        <AlertComponent>
          <Mail />
          <AlertTitle>{t('login.verifying_magic_link')}</AlertTitle>
          <AlertDescription>{t('login.verifying_description')}</AlertDescription>
        </AlertComponent>
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
          <AlertDescription>{urlState.magicLinkError}</AlertDescription>
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
      <div className='flex flex-row gap-1'>
        <p>{t('login.dont_have_account')}</p>
        <Link href='/sign-up'>{t('login.create_account')}</Link>
      </div>
    </div>
  )
}
