import Link from '@/components/Link'
import LoaderButton from '@/components/LoaderButton'
import PasswordInput from '@/components/forms/PasswordInput'
import TextInput from '@/components/forms/TextInput'
import { useSnackbar } from '@/hooks/use-snackbar'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { MailCheck } from 'lucide-react'
import { useState, type FC } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { signUpSchema } from '../../../server/schemas/auth.schemas'

export const SignUp: FC = () => {
  const { t } = useTranslation()
  const { show } = useSnackbar()

  const [isSigned, setIsSigned] = useState(false)

  const signUpMutation = useMutation(
    trpc.auth.signUp.mutationOptions({
      onSuccess: () => setIsSigned(true),
      onError: (error) => {
        console.log(error)
        show({
          variant: 'destructive',
          title: t('sign_up.error.title')
        })
      }
    })
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty }
  } = useForm({ resolver: zodResolver(signUpSchema), mode: 'onTouched' })

  const onSubmit = handleSubmit((data) => signUpMutation.mutate(data))

  return (
    <div className='w-md flex flex-col gap-2.5'>
      {isSigned ? (
        <>
          <div className='bg-green-50 border border-green-200 rounded-lg p-6 text-center'>
            <div className='flex flex-col items-center gap-4'>
              <div className='bg-green-100 rounded-full p-3'>
                <MailCheck className='w-8 h-8 text-green-600' />
              </div>
              <div className='space-y-2'>
                <h2 className='text-xl font-semibold text-green-800'>{t('sign_up.success_title')}</h2>
                <p className='text-green-700 leading-relaxed'>{t('sign_up.success_message')}</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <h2>{t('sign_up.title')}</h2>
          <TextInput
            type='email'
            placeholder={t('sign_up.email')}
            {...register('email')}
            {...(errors.email?.message && { errorMessage: t(errors.email.message) })}
          />
          <PasswordInput
            placeholder={t('sign_up.password')}
            {...register('password')}
            {...(errors.password?.message && { errorMessage: t(errors.password.message) })}
          />
          <PasswordInput
            placeholder={t('sign_up.confirm_password')}
            {...register('confirmPassword')}
            {...(errors.confirmPassword?.message && { errorMessage: t(errors.confirmPassword.message) })}
          />
          <LoaderButton
            disabled={!isValid || !isDirty}
            isLoading={signUpMutation.isPending}
            label={t('sign_up.button')}
            onClick={onSubmit}
          />
          <div className='flex flex-row gap-0.5'>
            <p>{t('sign_up.already_have_account')}</p>
            <Link href='/login'>{t('sign_up.login')}</Link>
          </div>
        </>
      )}
    </div>
  )
}

export default SignUp
