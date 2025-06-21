import LoaderButtton from '@/components/LoaderButton'
import { Input } from '@/components/ui/input'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { loginSchema, type LoginSchema } from '../../../server/schemas/auth.schemas'

export default function Login() {
  const { t } = useTranslation()

  const loginMutation = useMutation(
    trpc.auth.login.mutationOptions({
      onSuccess: (data) => {
        console.log(data)
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
    <>
      <h2>{t('login.title')}</h2>
      <Input type="email" placeholder={t('login.email')} {...register('email')} />
      <Input type="password" placeholder={t('login.password')} {...register('password')} />
      <LoaderButtton
        disabled={!email || !password}
        isLoading={loginMutation.isPending}
        label={t('login.button')}
        onClick={handleSubmit(onSubmit)}
      />
    </>
  )
}
