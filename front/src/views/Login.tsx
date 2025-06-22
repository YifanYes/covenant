import LoaderButtton from '@/components/LoaderButton'
import PasswordInput from '@/components/PasswordInput'
import { Input } from '@/components/ui/input'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { loginSchema, type LoginSchema } from '../../../server/schemas/auth.schemas'
import { useAuthStore } from '../hooks/useStore'

export default function Login() {
  const { t } = useTranslation()
  const { updateUserInfo } = useAuthStore()
  const navigate = useNavigate()

  const loginMutation = useMutation(
    trpc.auth.login.mutationOptions({
      onSuccess: (data) => {
        console.log(data)
        updateUserInfo({
          // TODO: fix type inference
          email: data.user.email as string,
          userId: data.user.id,
          accessToken: data.session.accessToken,
          refreshToken: data.session.refreshToken
        })

        navigate('/dashboard')
      },
      onError: (error) => console.log(error)
    })
  )

  const onSubmit = (data: LoginSchema) => {
    loginMutation.mutate(data)
  }

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: {
      email: '',
      password: ''
    },
    resolver: zodResolver(loginSchema)
  })

  const email = watch('email')
  const password = watch('password')

  return (
    <div className="w-xs flex flex-col gap-2.5">
      <h2>{t('login.title')}</h2>
      <Input type="email" placeholder={t('login.email')} {...register('email')} />
      <PasswordInput placeholder={t('login.password')} {...register('password')} />
      <LoaderButtton
        disabled={!email || !password}
        isLoading={loginMutation.isPending}
        label={t('login.button')}
        onClick={handleSubmit(onSubmit)}
      />
    </div>
  )
}
