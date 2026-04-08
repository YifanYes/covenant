'use client'
import LoaderButton from '@/common/loader-button.component'
import Button from '@/ui/button.component'
import Textarea from '@/ui/textarea.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { ChevronDown, ChevronUp, Close, MessageArrowRight } from '@nsmr/pixelart-react'
import type { CommentNode } from '@shared/types/forum.types'
import { useMutation } from '@tanstack/react-query'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export function countAllDescendants(comments: CommentNode[]): number {
  return comments.reduce((acc, comment) => acc + 1 + countAllDescendants(comment.children), 0)
}

function CommentItem({ comment, postId }: { comment: CommentNode; postId: string }) {
  const { t } = useTranslation()
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [showReplies, setShowReplies] = useState(false)
  const lastChildRef = useRef<HTMLDivElement>(null)
  const replyRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [])

  const replyMutation = useMutation({
    ...trpcOptions.forum.createReply.mutationOptions(),
    onSuccess: () => {
      setReplyContent('')
      setIsReplying(false)
      setShowReplies(true)
      queryClient
        .invalidateQueries({
          queryKey: trpcOptions.forum.getPostWithReplies.queryKey({ id: postId })
        })
        .then(() => {
          setTimeout(() => {
            lastChildRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }, 100)
        })
    }
  })

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">{comment.author.name}</span>
          <span className="text-muted-foreground text-xs">{new Date(comment.createdAt).toLocaleString()}</span>
        </div>
        <p className="mt-2 text-sm whitespace-pre-wrap">{comment.content}</p>
        <div className="mt-2 flex items-center gap-4">
          <button
            className="text-muted-foreground hover:text-foreground cursor-pointer text-xs"
            onClick={() => {
              if (isReplying) {
                setIsReplying(false)
                setReplyContent('')
              } else {
                setIsReplying(true)
              }
            }}
          >
            {isReplying ? t('cancel') : t('forum.reply')}
          </button>
          {comment.children.length > 0 && (
            <button
              className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 text-xs"
              onClick={() => setShowReplies(!showReplies)}
            >
              {showReplies ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  {t('forum.hide_replies')}
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  {t('forum.show_replies', { count: comment.children.length })}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {showReplies && comment.children.length > 0 && (
        <div className="ml-6 flex flex-col gap-2 border-l-2 border-border pl-6">
          {comment.children.map((child, index) => (
            <div key={child.id} ref={index === comment.children.length - 1 ? lastChildRef : undefined}>
              <CommentItem comment={child} postId={postId} />
            </div>
          ))}
        </div>
      )}

      {isReplying && (
        <div ref={replyRef} className="ml-6 flex flex-col gap-2 border-l-2 border-border pl-6">
          <div className="relative">
            <Textarea
              placeholder={t('forum.write_comment')}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="min-h-[80px] resize-none pb-12"
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-8 cursor-pointer px-2"
                onClick={() => {
                  setIsReplying(false)
                  setReplyContent('')
                }}
              >
                <Close className="mr-1 h-3 w-3" />
                {t('cancel')}
              </Button>
              <LoaderButton
                onClick={() => replyMutation.mutate({ parentId: comment.id, content: replyContent })}
                isLoading={replyMutation.isPending}
                disabled={!replyContent.trim()}
                label={t('forum.reply')}
                icon={<MessageArrowRight className="mr-1 h-3 w-3" />}
                size="sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CommentTree({ comments, postId }: { comments: CommentNode[]; postId: string }) {
  const { t } = useTranslation()

  if (comments.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('forum.no_comments')}</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} postId={postId} />
      ))}
    </div>
  )
}
