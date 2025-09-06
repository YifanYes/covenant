import LoaderButton from '@/components/LoaderButton'
import PasswordInput from '@/components/forms/PasswordInput'
import useHashParams from '@/hooks/use-hash-params'
import { useSnackbar } from '@/hooks/use-snackbar'
import { trpc } from '@/utils/trpc.utils'
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
          variant: 'success',
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

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty }
  } = useForm({ resolver: zodResolver(recoverPasswordSchema), mode: 'onTouched' })

  const onSubmit = handleSubmit(({ password }) =>
    recoverPasswordMutation.mutate({ password, accessToken, refreshToken })
  )

  useEffect(() => {
    if (errorCode) navigate('/login')
  }, [errorCode, navigate])

  return (
    <div className='flex w-md flex-col gap-2.5'>
      <h2>{t('recover_password.title')}</h2>
      <PasswordInput
        placeholder={t('recover_password.password')}
        {...register('password')}
        {...(errors.password?.message && { errorMessage: t(errors.password.message) })}
      />
      <PasswordInput
        placeholder={t('recover_password.confirm_password')}
        {...register('confirmPassword')}
        {...(errors.confirmPassword?.message && { errorMessage: t(errors.confirmPassword.message) })}
      />
      <LoaderButton
        disabled={!isValid || !isDirty}
        isLoading={recoverPasswordMutation.isPending}
        label={t('recover_password.button')}
        onClick={onSubmit}
      />
    </div>
  )
}

export default RecoverPassword
