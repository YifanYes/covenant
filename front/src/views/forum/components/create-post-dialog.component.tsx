import BaseFormDialog from '@/common/base-form-dialog.component'
import TextInput from '@/forms/text-input.component'
import Textarea from '@/ui/textarea.component'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { createPostSchema, type CreatePostType, Faction } from '@shared/schemas/forum.schemas'
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

  const mutation = useMutation(
    trpc.forum.createPost.mutationOptions({
      onSuccess: () => {
        toast.success(t('forum.success.create_post'))
        queryClient.invalidateQueries({ queryKey: trpc.forum.getPosts.queryKey({ faction }) })
        onOpenChange(false)
        reset()
      },
      onError: (error) => toast.error(t('forum.error.create_post'), { description: error.message })
    })
  )

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
      description: '',
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
          placeholder={t('forum.post_title_placeholder')}
          {...register('title')}
          {...(errors.title?.message && { errorMessage: t(errors.title.message.toString()) })}
          required
        />
        <Textarea
          placeholder={t('forum.description_placeholder')}
          className='h-[120px]'
          {...register('description')}
          {...(errors.description?.message && { errorMessage: t(errors.description.message.toString()) })}
          required
        />
      </div>
    </BaseFormDialog>
  )
}
