'use client'
import LoaderButton from '@/common/loader-button.component'
import TextInput from '@/forms/text-input.component'
import { cn } from '@/lib/cn.lib'
import Label from '@/ui/label.component'
import { queryClient, trpc, trpcOptions } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Check, ChevronLeft, ChevronRight } from '@nsmr/pixelart-react'
import { CharacterClassName, MagicNature } from '@shared/constants/classes'
import { createCharacterSchema, type CreateCharacterType } from '@shared/schemas/character.schemas'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const MAGIC_NATURE_QUESTIONS = [
  { id: 1, firstNature: MagicNature.ORDER },
  { id: 2, firstNature: MagicNature.CHAOS },
  { id: 3, firstNature: MagicNature.ORDER },
  { id: 4, firstNature: MagicNature.CHAOS },
  { id: 5, firstNature: MagicNature.ORDER }
] as const

function calculateMagicNature(answers: Record<number, MagicNature>): MagicNature {
  const orderCount = Object.values(answers).filter((a) => a === MagicNature.ORDER).length
  return orderCount >= 3 ? MagicNature.ORDER : MagicNature.CHAOS
}

export default function Onboarding() {
  const { t } = useTranslation()
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [answers, setAnswers] = useState<Record<number, MagicNature>>({})

  const createCharacterMutation = useMutation({
    ...trpcOptions.character.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.character.getCurrentClass.queryKey() })
      router.push('/objectives')
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
      className: CharacterClassName.TEMPLAR,
      magicNature: MagicNature.ORDER
    },
    resolver: standardSchemaResolver(createCharacterSchema),
    mode: 'onSubmit'
  })

  const handleAnswer = (questionId: number, answer: MagicNature) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }

  const allQuestionsAnswered = Object.keys(answers).length === MAGIC_NATURE_QUESTIONS.length

  const onSubmit = (data: CreateCharacterType) => {
    const magicNature = calculateMagicNature(answers)
    createCharacterMutation.mutate({ ...data, magicNature })
  }

  const goToStep2 = () => {
    if (isValid && isDirty) {
      setStep(2)
    }
  }

  return (
    <div className='flex min-h-screen w-full items-center justify-center p-4'>
      <div className={`flex w-full flex-col gap-6 ${step === 1 ? 'max-w-md' : 'max-w-2xl'}`}>
        {step === 1 ? (
          <>
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
                      {[CharacterClassName.TEMPLAR, CharacterClassName.HERALD].map((className) => (
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

              <button
                type='button'
                disabled={!isValid || !isDirty}
                onClick={goToStep2}
                className='bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground flex w-full cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2 font-medium transition-colors disabled:cursor-not-allowed'
              >
                {t('onboarding.next')}
                <ChevronRight className='h-4 w-4' />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className='mb-4 flex flex-col gap-4'>
              <div className='flex items-center'>
                <button
                  type='button'
                  onClick={() => setStep(1)}
                  className='text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 text-sm transition-colors'
                >
                  <ChevronLeft className='h-4 w-4' />
                  {t('onboarding.back')}
                </button>
                <h2 className='flex-1 text-center text-2xl font-bold'>{t('onboarding.magic_nature.title')}</h2>
              </div>
              <p className='text-muted-foreground text-sm'>{t('onboarding.magic_nature.subtitle')}</p>
            </div>

            <div className='grid gap-8'>
              {MAGIC_NATURE_QUESTIONS.map((question) => {
                // Order the natures based on firstNature
                const orderedNatures =
                  question.firstNature === MagicNature.ORDER
                    ? [MagicNature.ORDER, MagicNature.CHAOS]
                    : [MagicNature.CHAOS, MagicNature.ORDER]

                return (
                  <div key={question.id} className='grid gap-3'>
                    <p className='text-sm font-medium'>{t(`onboarding.magic_nature.q${question.id}.question`)}</p>
                    <div className='grid gap-2'>
                      {orderedNatures.map((nature) => (
                        <label
                          key={nature}
                          className={cn(
                            'border-input hover:border-primary flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition-all duration-200',
                            answers[question.id] === nature
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'dark:bg-input/30 hover:bg-primary/5 dark:hover:bg-primary/5 bg-transparent'
                          )}
                        >
                          <input
                            type='radio'
                            name={`question-${question.id}`}
                            value={nature}
                            checked={answers[question.id] === nature}
                            onChange={() => handleAnswer(question.id, nature)}
                            className='sr-only'
                          />
                          <span className='mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center'>
                            {answers[question.id] === nature ? (
                              <Check className='h-4 w-4' />
                            ) : (
                              <div className='bg-muted-foreground h-1.5 w-1.5 rounded-full' />
                            )}
                          </span>
                          <span>{t(`onboarding.magic_nature.q${question.id}.${nature}`)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}

              <LoaderButton
                disabled={!allQuestionsAnswered}
                isLoading={createCharacterMutation.isPending}
                onClick={handleSubmit(onSubmit)}
                label={t('onboarding.button')}
                className='w-full'
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
