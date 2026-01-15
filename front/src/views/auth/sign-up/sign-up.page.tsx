import { Link, LoaderButton } from '@/common'
import { TextInput } from '@/forms'
import { trpc } from '@/utils/trpc.utils'
import { GoogleLoginButton } from '@/views/auth/components'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { MailCheck } from '@nsmr/pixelart-react'
import { signUpSchema, type SignUpType } from '@shared/schemas/auth.schemas'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export default function SignUp() {
  const { t } = useTranslation()

  const [isSigned, setIsSigned] = useState(false)

  const signUpMutation = useMutation(
    trpc.auth.signUp.mutationOptions({
      onSuccess: () => setIsSigned(true),
      onError: (error) => toast.error(t('sign_up.error.title'), { description: error.message })
    })
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty }
  } = useForm<SignUpType>({ resolver: standardSchemaResolver(signUpSchema), mode: 'onTouched' })

  const onSubmit = (data: SignUpType) => signUpMutation.mutate(data)

  return (
    <div className='flex w-md flex-col gap-2.5'>
      {isSigned ? (
        <>
          <div className='dark:bg-card rounded-lg border-2 border-green-300 bg-green-50 p-6 text-center'>
            <div className='flex flex-col items-center gap-4'>
              <div className='rounded-full border-2 border-green-500 p-3 dark:border-green-400 dark:bg-green-200/10'>
                <MailCheck className='h-8 w-8 text-green-600 dark:text-green-400' />
              </div>
              <div className='space-y-2'>
                <h2 className='text-xl font-semibold text-green-800 dark:text-green-400'>
                  {t('sign_up.success_title')}
                </h2>
                <p className='leading-relaxed text-green-700 dark:text-green-200'>{t('sign_up.success_message')}</p>
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
            required
          />
          <LoaderButton
            disabled={!isValid || !isDirty}
            isLoading={signUpMutation.isPending}
            label={t('sign_up.button')}
            onClick={handleSubmit(onSubmit)}
          />
          <div className='relative flex items-center gap-2 py-2'>
            <div className='bg-border h-px w-full' />
            <span className='text-muted-foreground text-xs uppercase'>{t('login.or')}</span>
            <div className='bg-border h-px w-full' />
          </div>
          <GoogleLoginButton />
          <div className='flex flex-row gap-1'>
            <p>{t('sign_up.already_have_account')}</p>
            <Link href='/login'>{t('sign_up.login')}</Link>
          </div>
        </>
      )}
    </div>
  )
}
