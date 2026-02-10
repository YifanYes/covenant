'use client'
import Button from '@/ui/button.component'
import Card, { CardDescription, CardHeader, CardTitle } from '@/ui/card.component'
import { trpcOptions } from '@/utils/trpc.utils'
import { Loader, Plus } from '@nsmr/pixelart-react'
import { Faction } from '@shared/constants/activities'
import { useSuspenseQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CreatePostDialog from '../_components/create-post-dialog.component'
import { factionToKebab, kebabToFaction } from '../_utils/faction-slug.utils'

function ForumListContent({ faction }: { faction: Faction }) {
  const { t } = useTranslation()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const { data: posts } = useSuspenseQuery(trpcOptions.forum.getPosts.queryOptions({ faction }))

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
  const redirectTarget = !hasValidFaction ? '/forum' : `/forum/${factionToKebab(userFaction)}`

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
