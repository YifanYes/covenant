import LoaderButton from '@/components/LoaderButton'
import TextInput from '@/components/forms/TextInput'
import { Label } from '@/components/ui/label'
import { useSnackbar } from '@/hooks/use-snackbar'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { CharacterClassName } from '@shared/constants/classes'
import { createCharacterSchema, type CreateCharacterType } from '@shared/schemas/character.schemas'
import { useMutation } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useHandleMagicLink } from '../hooks/use-handle-magic-link'

export default function Onboarding() {
  const { t } = useTranslation()
  useHandleMagicLink()
  const navigate = useNavigate()
  const { show } = useSnackbar()

  const createCharacterMutation = useMutation({
    ...trpc.character.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.character.getCurrent.queryKey() })
      navigate('/objectives')
    },
    onError: (error) => {
      show({
        variant: 'destructive',
        title: t('onboarding.error.title'),
        description: error.message
      })
    }
  })

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty }
  } = useForm<CreateCharacterType>({
    defaultValues: {
      name: '',
      className: CharacterClassName.KNIGHT
    },
    resolver: standardSchemaResolver(createCharacterSchema),
    mode: 'onTouched'
  })

  const onSubmit = (data: CreateCharacterType) => {
    createCharacterMutation.mutate(data)
  }

  return (
    <div className='flex min-h-screen w-full items-center justify-center p-4'>
      <div className='flex w-full max-w-md flex-col gap-6'>
        <div>
          <h2>{t('onboarding.title')}</h2>
          <p className='text-muted-foreground'>{t('onboarding.subtitle')}</p>
        </div>

        <div className='grid gap-4'>
          <div className='grid gap-2'>
            <Label htmlFor='name'>{t('onboarding.name_label')}</Label>
            <TextInput
              id='name'
              type='text'
              placeholder={t('onboarding.name_placeholder')}
              {...register('name')}
              {...(errors.name?.message && { errorMessage: t(errors.name.message.toString()) })}
              required
            />
          </div>

          <div className='grid gap-2'>
            <Label>{t('onboarding.class_label')}</Label>
            <Controller
              name='className'
              control={control}
              render={({ field }) => (
                <div className='grid gap-3'>
                  {Object.values(CharacterClassName).map((className) => (
                    <label
                      key={className}
                      className='hover:bg-accent flex cursor-pointer items-start space-y-0 space-x-3 rounded-md border p-4'
                    >
                      <input
                        type='radio'
                        value={className}
                        checked={field.value === className}
                        onChange={(e) => field.onChange(e.target.value)}
                        className='mt-0.5'
                      />
                      <div className='flex-1'>
                        <div className='font-medium'>{t(`classes.${className}.name`)}</div>
                        <p className='text-muted-foreground text-sm'>{t(`classes.${className}.description`)}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            />
          </div>

          <LoaderButton
            disabled={!isValid || !isDirty}
            isLoading={createCharacterMutation.isPending}
            onClick={handleSubmit(onSubmit)}
            label={t('onboarding.button')}
            className='w-full'
          />
        </div>
      </div>
    </div>
  )
}
