import LoaderButton from '@/components/LoaderButton'
import PasswordInput from '@/components/PasswordInput'
import { Input } from '@/components/ui/input'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState, type FC } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { signUpSchema } from '../../../server/schemas/auth.schemas'

export const SignUp: FC = () => {
  const { t } = useTranslation()

  const [isSigned, setIsSigned] = useState(false)

  const signUpMutation = useMutation(
    trpc.auth.signUp.mutationOptions({
      onSuccess: () => setIsSigned(true),
      onError: (error) => console.log(error)
    })
  )

  const { register, handleSubmit, watch } = useForm({ resolver: zodResolver(signUpSchema) })

  const email = watch('email')
  const password = watch('password')
  const confirmPassword = watch('confirmPassword')

  const onSubmit = handleSubmit((data) => signUpMutation.mutate(data))

  return (
    <div className='w-xs flex flex-col gap-2.5'>
      <h2>{t(isSigned ? 'signup.success_title' : 'signup.title')}</h2>
      {isSigned ? (
        <p>{t('signup.success_message')}</p>
      ) : (
        <>
          <Input type='email' placeholder={t('signup.email')} {...register('email')} />
          <PasswordInput placeholder={t('signup.password')} {...register('password')} />
          <PasswordInput placeholder={t('signup.confirm_password')} {...register('confirmPassword')} />
          <LoaderButton
            disabled={!email || !password || !confirmPassword || password !== confirmPassword}
            isLoading={signUpMutation.isPending}
            label={t('signup.button')}
            onClick={onSubmit}
          />
        </>
      )}
    </div>
  )
}

export default SignUp
