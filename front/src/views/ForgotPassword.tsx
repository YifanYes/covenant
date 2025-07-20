import LoaderButton from '@/components/LoaderButton'
import { Input } from '@/components/ui/input'
import { useSnackbar } from '@/hooks/useSnackbar'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState, type FC } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { forgotPasswordSchema } from '../../../server/schemas/auth.schemas'

export const ForgotPassword: FC = () => {
  const { t } = useTranslation()
  const { show } = useSnackbar()

  const [isSubmitted, setIsSubmitted] = useState(false)

  const forgotPasswordMutation = useMutation(
    trpc.auth.forgotPassword.mutationOptions({
      onSuccess: () => setIsSubmitted(true),
      onError: (error) => {
        console.log(error)
        show({
          variant: 'destructive',
          title: t('forgot_password.error.title')
        })
      }
    })
  )

  const { register, handleSubmit, watch } = useForm({ resolver: zodResolver(forgotPasswordSchema) })

  const email = watch('email')

  const onSubmit = handleSubmit((data) => forgotPasswordMutation.mutate(data))

  return (
    <div className='w-xs flex flex-col gap-2.5'>
      <h2>{t(isSubmitted ? 'forgot_password.success.title' : 'forgot_password.title')}</h2>
      {isSubmitted ? (
        <p>{t('forgot_password.success_message')}</p>
      ) : (
        <>
          <Input type='email' placeholder={t('forgot_password.email')} {...register('email')} />
          <LoaderButton
            disabled={!email}
            isLoading={forgotPasswordMutation.isPending}
            label={t('recover_password.button')}
            onClick={onSubmit}
          />
        </>
      )}
    </div>
  )
}

export default ForgotPassword
