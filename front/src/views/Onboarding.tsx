import LoaderButton from '@/components/LoaderButton'
import TextInput from '@/components/forms/TextInput'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Check } from '@nsmr/pixelart-react'
import { CharacterClassName } from '@shared/constants/classes'
import { createCharacterSchema, type CreateCharacterType } from '@shared/schemas/character.schemas'
import { useMutation } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

export default function Onboarding() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const createCharacterMutation = useMutation({
    ...trpc.character.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.character.getCurrentClass.queryKey() })
      navigate('/objectives')
    },
    onError: (error) => toast.error(t('onboarding.error.title'), { description: error.message })
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
        <div className='mb-6 flex flex-col gap-2'>
          <h2 className='text-2xl font-bold'>{t('onboarding.title')}</h2>
          <p className='text-muted-foreground text-sm'>{t('onboarding.subtitle')}</p>
        </div>

        <div className='grid gap-8'>
          <div className='grid gap-2'>
            <Label htmlFor='name'>{t('onboarding.name_label')}</Label>
            <TextInput
              id='name'
              type='text'
              placeholder={t('onboarding.name_placeholder')}
              {...register('name')}
              {...(errors.name?.message && { errorMessage: t(errors.name.message.toString()) })}
              required
              className='hover:bg-primary/20 hover:text-primary hover:border-primary dark:hover:bg-primary/20'
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
                      className={cn(
                        'border-input hover:text-primary hover:border-primary flex cursor-pointer items-center gap-3.5 rounded-md border p-4 shadow-xs transition-all duration-200',
                        field.value === className
                          ? 'bg-primary/10 border-primary text-primary hover:bg-primary/20 dark:hover:bg-primary/20'
                          : 'dark:bg-input/30 hover:bg-primary/5 dark:hover:bg-primary/5 bg-transparent'
                      )}
                    >
                      <input
                        type='radio'
                        value={className}
                        checked={field.value === className}
                        onChange={(e) => field.onChange(e.target.value)}
                        className='sr-only'
                      />
                      <span className='flex h-4 w-4 items-center justify-center'>
                        {field.value === className ? (
                          <Check className='h-4 w-4' />
                        ) : (
                          <div className='bg-muted-foreground h-1.5 w-1.5 rounded-full' />
                        )}
                      </span>
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
