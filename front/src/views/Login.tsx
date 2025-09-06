import Link from '@/components/Link'
import LoaderButton from '@/components/LoaderButton'
import PasswordInput from '@/components/forms/PasswordInput'
import TextInput from '@/components/forms/TextInput'
import { useSnackbar } from '@/hooks/use-snackbar'
import { trpc } from '@/utils/trpc.utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { loginSchema, type LoginSchema } from '../../../server/schemas/auth.schemas'
import { useAuthStore } from '../hooks/use-auth-store'

export default function Login() {
  const { t } = useTranslation()
  const { updateUserInfo } = useAuthStore()
  const navigate = useNavigate()
  const { show } = useSnackbar()

  const loginMutation = useMutation(
    trpc.auth.login.mutationOptions({
      onSuccess: (data) => {
        updateUserInfo({
          email: data.user.email as string,
          userId: data.user.id,
          accessToken: data.session.accessToken,
          refreshToken: data.session.refreshToken
        })

        navigate('/dashboard')
      },
      onError: (error) => {
        console.log(error)

        if (error?.message === 'Invalid credentials') {
          show({
            variant: 'destructive',
            title: t('login.error.invalid_credentials')
          })
          return
        }

        show({
          variant: 'destructive',
          title: t('login.error.title')
        })
      }
    })
  )

  const onSubmit = (data: LoginSchema) => {
    loginMutation.mutate(data)
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty }
  } = useForm({
    defaultValues: { email: '', password: '' },
    resolver: zodResolver(loginSchema),
    mode: 'onTouched'
  })

  return (
    <div className='flex w-md flex-col gap-2.5'>
      <h2>{t('login.title')}</h2>
      <TextInput
        type='email'
        placeholder={t('login.email')}
        {...register('email')}
        {...(errors.email?.message && { errorMessage: t(errors.email.message) })}
      />
      <PasswordInput
        placeholder={t('login.password')}
        {...register('password')}
        {...(errors.password?.message && { errorMessage: t(errors.password.message) })}
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
      <div className='flex flex-row gap-1'>
        <p>{t('login.forgot_password')}</p>
        <Link href='/forgot-password'>{t('login.recover_password')}</Link>
      </div>
    </div>
  )
}
