'use client'
import AlertDialog, {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/ui/alert-dialog.component'
import Button from '@/ui/button.component'
import Card, { CardDescription, CardHeader, CardTitle } from '@/ui/card.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { Loader, Plus } from '@nsmr/pixelart-react'
import { Faction } from '@shared/constants/activities'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import CreatePostDialog from '../_components/create-post-dialog.component'
import { factionToKebab, kebabToFaction } from '../_utils/faction-slug.utils'

function ForumListContent({ faction }: { faction: Faction }) {
  const { t } = useTranslation()
  const router = useRouter()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const { data: posts } = useSuspenseQuery(trpcOptions.forum.getPosts.queryOptions({ faction }))

  const leaveMutation = useMutation({
    ...trpcOptions.forum.leaveFaction.mutationOptions(),
    onSuccess: () => {
      toast.success(t('forum.success.leave_faction'))
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() })
      router.push('/forum')
    }
  })

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold tracking-tight">
            {t('forum.title')} - {t(`factions.${faction}`)}
          </h1>
          <p className="text-muted-foreground">{t('forum.posts_description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="text-destructive border-destructive hover:text-background hover:bg-destructive cursor-pointer"
              >
                {t('forum.leave_faction')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('forum.leave_faction_confirm')}</AlertDialogTitle>
                <AlertDialogDescription>{t('forum.leave_faction_description')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/60"
                  onClick={() => leaveMutation.mutate({})}
                >
                  {t('forum.leave_faction')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button className="cursor-pointer" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            {t('forum.create_post')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {posts.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed">
            <p className="text-muted-foreground text-sm">{t('forum.no_posts')}</p>
          </div>
        ) : (
          posts.map((post) => (
            <Link key={post.id} href={`/forum/${factionToKebab(faction)}/${post.id}`}>
              <Card className="cursor-pointer transition-colors hover:bg-accent/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{post.title}</CardTitle>
                    <span className="text-muted-foreground text-xs">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <CardDescription className="line-clamp-2">{post.content}</CardDescription>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {t('forum.posted_by')}: {post.author.name}
                    </span>
                    <span className="text-muted-foreground text-xs">•</span>
                    <span className="text-muted-foreground text-xs">
                      {post._count.children} {t('forum.comments')}
                    </span>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))
        )}
      </div>

      <CreatePostDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} faction={faction} />
    </div>
  )
}

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader className="h-10 w-10 animate-spin" />
    </div>
  )
}

export default function ForumListPage() {
  const router = useRouter()
  const params = useParams<{ faction: string }>()
  const { data: character } = useSuspenseQuery(trpcOptions.character.getCurrentClass.queryOptions())

  const userFaction = character?.factionName
  const hasValidFaction = userFaction && userFaction !== ''

  let urlFaction: Faction | null = null
  try {
    urlFaction = kebabToFaction(params.faction)
  } catch {
    // invalid slug, will redirect below
  }

  const needsRedirect = !hasValidFaction || !urlFaction || urlFaction !== userFaction
  const redirectTarget = !hasValidFaction
    ? '/forum'
    : `/forum/${factionToKebab(userFaction)}`

  useEffect(() => {
    if (needsRedirect) {
      router.replace(redirectTarget)
    }
  }, [needsRedirect, redirectTarget, router])

  if (needsRedirect) {
    return <FullPageLoader />
  }

  return <ForumListContent faction={urlFaction!} />
}
