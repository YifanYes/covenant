'use client'
import LoaderButton from '@/common/loader-button.component'
import Textarea from '@/ui/textarea.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { Close, Loader, MessageArrowRight } from '@nsmr/pixelart-react'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CommentTree, { countAllDescendants } from '../../_components/comment-tree.component'
import { factionToKebab } from '../../_utils/faction-slug.utils'

function timeAgo(date: Date | string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return t('forum.time_ago.just_now')
  if (diffMin < 60) return t('forum.time_ago.minutes', { count: diffMin })
  if (diffHours < 24) return t('forum.time_ago.hours', { count: diffHours })
  if (diffDays < 30) return t('forum.time_ago.days', { count: diffDays })
  return new Date(date).toLocaleDateString()
}

function PostContent({ id, userFaction }: { id: string; userFaction: string }) {
  const { t } = useTranslation()
  const [commentContent, setCommentContent] = useState('')
  const commentsEndRef = useRef<HTMLDivElement>(null)

  const { data: post } = useSuspenseQuery(trpcOptions.forum.getPostWithReplies.queryOptions({ id }))

  const totalComments = useMemo(() => countAllDescendants(post.children), [post.children])

  const createReplyMutation = useMutation({
    ...trpcOptions.forum.createReply.mutationOptions(),
    onSuccess: () => {
      setCommentContent('')
      queryClient.invalidateQueries({ queryKey: trpcOptions.forum.getPostWithReplies.queryKey({ id }) }).then(() => {
        setTimeout(() => {
          commentsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      })
    }
  })

  return (
    <div className="-mx-4 -my-6 flex h-dvh flex-col sm:-mx-6 lg:-mx-8">
      {/* Fixed header — close, author, time, faction */}
      <div className="bg-background flex shrink-0 items-center gap-3 border-b p-4">
        <Link
          href={`/forum/${factionToKebab(userFaction)}`}
          className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer rounded-full p-1 transition-colors"
        >
          <Close className="h-5 w-5" />
        </Link>
        <span className="text-sm font-semibold">{post.author.name}</span>
        <span className="text-muted-foreground text-xs">·</span>
        <span className="text-muted-foreground text-xs">{timeAgo(post.createdAt, t)}</span>
        <span className="text-muted-foreground text-xs">·</span>
        <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
          {t(`factions.${post.faction}`)}
        </span>
      </div>

      {/* Scrollable content — title, description, comments */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-10 p-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{post.title}</h1>
            <p className="text-foreground/90 text-sm whitespace-pre-wrap">{post.content}</p>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">
              {t('forum.responses')} ({totalComments})
            </h2>
            <CommentTree comments={post.children} postId={id} />
            <div ref={commentsEndRef} />
          </div>
        </div>
      </div>

      {/* Fixed bottom comment bar */}
      <div className="bg-background flex shrink-0 items-center gap-3 border-t p-6">
        <Textarea
          placeholder={t('forum.write_comment')}
          value={commentContent}
          onChange={(e) => setCommentContent(e.target.value)}
          className="min-h-[44px] flex-1 resize-none py-2.5"
          rows={1}
        />
        <LoaderButton
          className="h-[44px]"
          onClick={() => createReplyMutation.mutate({ parentId: id, content: commentContent })}
          isLoading={createReplyMutation.isPending}
          disabled={!commentContent.trim()}
          label={t('forum.reply')}
          icon={<MessageArrowRight className="mr-2 h-4 w-4" />}
        />
      </div>
    </div>
  )
}

export default function ForumPostPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { data: character } = useSuspenseQuery(trpcOptions.character.getCurrentClass.queryOptions())

  const userFaction = character?.factionName
  const hasValidFaction = userFaction && userFaction !== ''

  useEffect(() => {
    if (!hasValidFaction) {
      router.replace('/forum')
    }
  }, [hasValidFaction, router])

  if (!hasValidFaction) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader className="h-10 w-10 animate-spin" />
      </div>
    )
  }

  return <PostContent id={id} userFaction={userFaction} />
}
