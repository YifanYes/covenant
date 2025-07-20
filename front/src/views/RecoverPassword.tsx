import LoaderButton from '@/components/LoaderButton'
import PasswordInput from '@/components/PasswordInput'
import useHashParams from '@/hooks/use-hash-params'
import { useSnackbar } from '@/hooks/useSnackbar'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useEffect, type FC } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { recoverPasswordSchema } from '../../../server/schemas/auth.schemas'

export const RecoverPassword: FC = () => {
  const { t } = useTranslation()
  const { show } = useSnackbar()
  const navigate = useNavigate()
  const hashParams = useHashParams()

  const accessToken = hashParams.access_token
  const refreshToken = hashParams.refresh_token
  const errorCode = hashParams.error_code

  const recoverPasswordMutation = useMutation(
    trpc.auth.updatePassword.mutationOptions({
      onSuccess: () => {
        show({
          variant: 'default',
          title: t('recover_password.success.title')
        })
        navigate('/login')
      },
      onError: (error) => {
        console.log(error)
        show({
          variant: 'destructive',
          title: t('recover_password.error.title')
        })
      }
    })
  )

  const { register, handleSubmit, watch } = useForm({ resolver: zodResolver(recoverPasswordSchema) })

  const password = watch('password')
  const confirmPassword = watch('confirmPassword')

  const onSubmit = handleSubmit(({ password }) =>
    recoverPasswordMutation.mutate({ password, accessToken, refreshToken })
  )

  useEffect(() => {
    if (errorCode) navigate('/login')
  }, [errorCode])

  return (
    <div className='w-xs flex flex-col gap-2.5'>
      <h2>{t('recover_password.title')}</h2>
      <PasswordInput placeholder={t('recover_password.password')} {...register('password')} />
      <PasswordInput placeholder={t('recover_password.confirm_password')} {...register('confirmPassword')} />
      <LoaderButton
        disabled={!password || !confirmPassword || password !== confirmPassword || !accessToken || !refreshToken}
        isLoading={recoverPasswordMutation.isPending}
        label={t('recover_password.button')}
        onClick={onSubmit}
      />
    </div>
  )
}

export default RecoverPassword
