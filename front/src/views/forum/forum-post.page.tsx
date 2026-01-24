import LoaderButton from '@/common/loader-button.component'
import Button from '@/ui/button.component'
import Card, { CardContent, CardHeader, CardTitle } from '@/ui/card.component'
import Textarea from '@/ui/textarea.component'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { ChevronLeft, MessageArrowRight } from '@nsmr/pixelart-react'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'

export default function ForumPost() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id, faction } = useParams<{ id: string; faction: string }>()
  const [commentContent, setCommentContent] = useState('')

  const { data: post } = useSuspenseQuery(trpc.forum.getPostById.queryOptions({ id: id! }))
  const { data: comments } = useSuspenseQuery(trpc.forum.getComments.queryOptions({ id: id! }))

  const createCommentMutation = useMutation(
    trpc.forum.createComment.mutationOptions({
      onSuccess: () => {
        setCommentContent('')
        queryClient.invalidateQueries({ queryKey: trpc.forum.getComments.queryKey({ id: id! }) })
      }
    })
  )

  return (
    <div className='flex flex-col gap-6 p-6'>
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='icon' onClick={() => navigate(`/forum/${faction}`)}>
          <ChevronLeft className='h-6 w-6' />
        </Button>
        <h1 className='text-3xl font-bold tracking-tight'>{t('forum.title')}</h1>
      </div>

      <Card>
        <CardHeader>
          <div className='flex items-center gap-3'>
            <div className='h-12 w-12 overflow-hidden rounded-md border-2 border-zinc-200 bg-zinc-50'>
              <img
                src={`/assets/classes/${post.author.currentClass}.png`}
                alt={post.author.currentClass}
                className='pixelated h-full w-full object-contain'
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            <div className='flex flex-col'>
              <CardTitle className='text-2xl'>{post.title}</CardTitle>
              <span className='text-muted-foreground text-xs'>
                {post.author.name} • {new Date(post.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className='whitespace-pre-wrap text-zinc-800'>{post.description}</CardContent>
      </Card>

      <div className='flex flex-col gap-4'>
        <h2 className='text-xl font-bold'>
          {t('forum.comments')} ({comments.length})
        </h2>

        <div className='flex flex-col gap-4'>
          {comments.map((comment) => (
            <div key={comment.id} className='flex gap-4 rounded-lg border bg-white p-4'>
              <div className='flex min-w-[80px] flex-col items-center gap-1'>
                <div className='h-12 w-12 overflow-hidden rounded-md border-2 border-zinc-200 bg-zinc-50'>
                  <img
                    src={`/assets/classes/${comment.author.currentClass}.png`}
                    alt={comment.author.currentClass}
                    className='pixelated h-full w-full object-contain'
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                <span
                  className='max-w-[80px] truncate text-[10px] font-bold uppercase'
                  title={comment.author.title || ''}
                >
                  {comment.author.title || t('common.novice')}
                </span>
                <span className='rounded bg-zinc-100 px-1 text-[10px]'>T{comment.author.tier || 1}</span>
              </div>
              <div className='flex flex-1 flex-col gap-2'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-bold'>{comment.author.name}</span>
                  <span className='text-muted-foreground text-xs'>{new Date(comment.createdAt).toLocaleString()}</span>
                </div>
                <p className='text-sm whitespace-pre-wrap text-zinc-700'>{comment.content}</p>
              </div>
            </div>
          ))}
        </div>

        <div className='mt-4 flex flex-col gap-3'>
          <Textarea
            placeholder={t('forum.write_comment')}
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            className='min-h-[100px]'
          />
          <div className='flex justify-end'>
            <LoaderButton
              onClick={() => createCommentMutation.mutate({ postId: id!, content: commentContent })}
              isLoading={createCommentMutation.isPending}
              disabled={!commentContent.trim()}
              label={t('forum.reply')}
              icon={<MessageArrowRight className='mr-2 h-4 w-4' />}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
