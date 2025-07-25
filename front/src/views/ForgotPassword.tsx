import TextInput from '@/components/forms/TextInput'
import LoaderButton from '@/components/LoaderButton'
import { useSnackbar } from '@/hooks/useSnackbar'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { MailCheck } from 'lucide-react'
import { useState, type FC } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { forgotPasswordSchema } from '../../../server/schemas/auth.schemas'

export const ForgotPassword: FC = () => {
  const { t } = useTranslation()
  const { show } = useSnackbar()

  const [isSubmitted, setIsSubmitted] = useState(false)

  const forgotPasswordMutation = useMutation(
    trpc.auth.resetPassword.mutationOptions({
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

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty }
  } = useForm({ resolver: zodResolver(forgotPasswordSchema), mode: 'onTouched' })

  const onSubmit = handleSubmit((data) => forgotPasswordMutation.mutate(data))

  return (
    <div className='w-md flex flex-col gap-2.5'>
      {isSubmitted ? (
        <>
          <div className='bg-green-50 border border-green-200 rounded-lg p-6 text-center'>
            <div className='flex flex-col items-center gap-4'>
              <div className='bg-green-100 rounded-full p-3'>
                <MailCheck className='w-8 h-8 text-green-600' />
              </div>
              <div className='space-y-2'>
                <h2 className='text-xl font-semibold text-green-800'>{t('forgot_password.success.title')}</h2>
                <p className='text-green-700 leading-relaxed'>{t('forgot_password.success.message')}</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <h2>{t('forgot_password.title')}</h2>
          <TextInput
            type='email'
            placeholder={t('forgot_password.email')}
            {...register('email')}
            {...(errors.email?.message && { errorMessage: t(errors.email.message) })}
          />
          <LoaderButton
            disabled={!isValid || !isDirty}
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
