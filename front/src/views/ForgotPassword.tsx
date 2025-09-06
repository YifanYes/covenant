import TextInput from '@/components/forms/TextInput'
import LoaderButton from '@/components/LoaderButton'
import { useSnackbar } from '@/hooks/use-snackbar'
import { trpc } from '@/utils/trpc.utils'
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
    <div className='flex w-md flex-col gap-2.5'>
      {isSubmitted ? (
        <>
          <div className='dark:bg-card rounded-lg border-2 border-green-500 bg-green-50 p-6 text-center'>
            <div className='flex flex-col items-center gap-4'>
              <div className='rounded-full border-2 border-green-500 p-3 dark:border-green-400 dark:bg-green-200/10'>
                <MailCheck className='h-8 w-8 text-green-600 dark:text-green-400' />
              </div>
              <div className='space-y-2'>
                <h2 className='text-xl font-semibold text-green-800 dark:text-green-400'>
                  {t('forgot_password.success.title')}
                </h2>
                <p className='leading-relaxed text-green-700 dark:text-green-200'>
                  {t('forgot_password.success.message')}
                </p>
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
