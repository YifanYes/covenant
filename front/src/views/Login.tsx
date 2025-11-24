import Link from '@/components/Link'
import LoaderButton from '@/components/LoaderButton'
import TextInput from '@/components/forms/TextInput'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useSnackbar } from '@/hooks/use-snackbar'
import { trpc } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { loginSchema, type LoginType } from '@schemas/auth.schemas'
import { useMutation } from '@tanstack/react-query'
import { AlertCircle, CheckCircle, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'
import { useAuthStore } from '../hooks/use-auth-store'

export default function Login() {
  const { t } = useTranslation()
  const { updateUserInfo } = useAuthStore()
  const navigate = useNavigate()
  const { show } = useSnackbar()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isAccountVerified, setIsAccountVerified] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false)
  const [magicLinkError, setMagicLinkError] = useState<string | null>(null)

  const loginMutation = useMutation(
    trpc.auth.login.mutationOptions({
      onSuccess: () => {
        setMagicLinkSent(true)
        show({
          variant: 'success',
          title: t('login.success')
        })
      },
      onError: (error) => {
        console.log(error)
        show({
          variant: 'destructive',
          title: t('login.error.title'),
          description: error.message
        })
      }
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

  useEffect(() => {
    // Parse hash fragment for Supabase magic link callback
    const hash = window.location.hash.substring(1) // Remove the '#'
    const hashParams = new URLSearchParams(hash)
    
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    const hashType = hashParams.get('type')
    
    // Check for errors in hash (e.g., expired magic link)
    const error = hashParams.get('error')
    const errorDescription = hashParams.get('error_description')
    
    // Check search params for other scenarios
    const verified = searchParams.get('verified')
    const type = searchParams.get('type')
    const redirectTo = searchParams.get('redirect_to')


    if (error && errorDescription) {
      setMagicLinkError(errorDescription.replace(/\+/g, ' '))
      
      window.history.replaceState(null, '', window.location.pathname)
      return
    }

    // Handle Supabase magic link callback (tokens in URL hash)
    if (accessToken && refreshToken) {
      setIsVerifyingOTP(true)
      
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]))
        const userEmail = payload.email
        const userId = payload.sub
        
        updateUserInfo({
          email: userEmail,
          userId: userId,
          accessToken: accessToken,
          refreshToken: refreshToken
        })
        
        // Clear the hash from the URL
        window.history.replaceState(null, '', window.location.pathname)

        // Navigate to the desired location after successful login
        const destination = redirectTo ? new URL(redirectTo).pathname : '/dashboard'
        navigate(destination)
      } catch (error) {
        console.error('Error parsing access token:', error)
        setIsVerifyingOTP(false)
        show({
          variant: 'destructive',
          title: t('login.error.invalid_magic_link'),
          description: 'Failed to parse authentication tokens'
        })
      }
      return
    }

    // Check if account was verified (either via 'verified' param or 'type=signup' from hash)
    if (verified === 'true' || type === 'signup' || hashType === 'signup') {
      setIsAccountVerified(true)

      // Clean up the URL parameters
      const newSearchParams = new URLSearchParams(searchParams)
      newSearchParams.delete('verified')
      newSearchParams.delete('type')
      newSearchParams.delete('redirect_to')
      setSearchParams(newSearchParams, { replace: true })
      
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }

      // After verification, redirect to the provided destination (default to onboarding)
      const destination = redirectTo ? new URL(redirectTo).pathname : '/onboarding'
      navigate(destination)
    }

  }, [searchParams, setSearchParams, updateUserInfo, navigate, show, t])

  if (isVerifyingOTP) {
    return (
      <div className='flex w-md flex-col gap-2.5'>
        <h2>{t('login.verifying_title')}</h2>
        <Alert>
          <Mail />
          <AlertTitle>{t('login.verifying_magic_link')}</AlertTitle>
          <AlertDescription>{t('login.verifying_description')}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (magicLinkSent) {
    return (
      <div className='flex w-md flex-col gap-2.5'>
        <h2>{t('login.check_email_title')}</h2>
        <Alert variant='success'>
          <Mail />
          <AlertTitle>{t('login.magic_link_sent_title')}</AlertTitle>
          <AlertDescription>{t('login.magic_link_sent_description')}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className='flex w-md flex-col gap-2.5'>
      <h2>{t('login.title')}</h2>
      {isAccountVerified && (
        <Alert variant='success'>
          <CheckCircle />
          <AlertTitle>{t('login.account_verified.title')}</AlertTitle>
          <AlertDescription>{t('login.account_verified.description')}</AlertDescription>
        </Alert>
      )}
      {magicLinkError && (
        <Alert variant='destructive'>
          <AlertCircle />
          <AlertTitle>{t('login.error.magic_link_error')}</AlertTitle>
          <AlertDescription>{magicLinkError}</AlertDescription>
        </Alert>
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
