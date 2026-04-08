'use client'
import BaseFormDialog from '@/common/base-form-dialog.component'
import TextInput from '@/forms/text-input.component'
import Textarea from '@/ui/textarea.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Faction } from '@shared/constants/activities'
import { createPostSchema, type CreatePostType } from '@shared/schemas/forum.schemas'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface CreatePostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  faction: Faction
}

export default function CreatePostDialog({ open, onOpenChange, faction }: CreatePostDialogProps) {
  const { t } = useTranslation()

  const mutation = useMutation({
    ...trpcOptions.forum.createPost.mutationOptions(),
    onSuccess: () => {
      toast.success(t('forum.success.create_post'))
      queryClient.invalidateQueries({ queryKey: trpcOptions.forum.getPosts.queryKey({ faction }) })
      onOpenChange(false)
      reset()
    },
    onError: (error) => {
      const isForbidden = error.data?.code === 'FORBIDDEN'
      toast.error(isForbidden ? t('forum.error.forbidden') : t('forum.error.create_post'), {
        description: isForbidden ? undefined : error.message
      })
    }
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid, isDirty }
  } = useForm<CreatePostType>({
    resolver: standardSchemaResolver(createPostSchema),
    mode: 'onSubmit',
    defaultValues: {
      title: '',
      content: '',
      faction: faction
    }
  })

  const onSubmit = (data: CreatePostType) => mutation.mutate(data)

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title='forum.create_post'
      description='forum.create_post_description'
      onSubmit={handleSubmit(onSubmit)}
      submitLabel='create'
      isLoading={mutation.isPending}
      isSubmitDisabled={!isValid || !isDirty}
      className='md:max-w-fit md:min-w-[500px]'
    >
      <div className='grid gap-4'>
        <TextInput
          placeholder={t('forum.title_placeholder')}
          {...register('title')}
          {...(errors.title?.message && { errorMessage: t(errors.title.message.toString()) })}
          required
        />
        <Textarea
          placeholder={t('forum.description_placeholder')}
          className='h-[120px]'
          {...register('content')}
          {...(errors.content?.message && { errorMessage: t(errors.content.message.toString()) })}
          required
        />
      </div>
    </BaseFormDialog>
  )
}
