import LoaderButton from '@/common/loader-button.component'
import Button from '@/ui/button.component'
import Card, { CardDescription, CardHeader, CardTitle } from '@/ui/card.component'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { ChevronLeft, Plus } from '@nsmr/pixelart-react'
import { Faction } from '@shared/schemas/forum.schemas'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import CreatePostDialog from './components/create-post-dialog.component'

export default function ForumList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { faction } = useParams<{ faction: string }>()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const { data: character } = useSuspenseQuery(trpc.character.getCurrentClass.queryOptions())
  const { data: posts } = useSuspenseQuery(trpc.forum.getPosts.queryOptions({ faction: faction as Faction }))

  const leaveMutation = useMutation(
    trpc.forum.leaveFaction.mutationOptions({
      onSuccess: () => {
        toast.success(t('forum.success.leave_faction'))
        queryClient.invalidateQueries({ queryKey: trpc.character.getCurrentClass.queryKey() })
        navigate('/forum')
      }
    })
  )

  const isCurrentFaction = character?.factionName === faction

  return (
    <div className='flex flex-col gap-6 p-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' onClick={() => navigate('/forum')}>
            <ChevronLeft className='h-6 w-6' />
          </Button>
          <div className='flex flex-col'>
            <h1 className='text-3xl font-bold tracking-tight'>
              {t(`factions.${faction}`)} {t('forum.title')}
            </h1>
            <p className='text-muted-foreground'>{t('forum.posts_description')}</p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          {isCurrentFaction && (
            <LoaderButton
              className='text-destructive border-destructive hover:text-background hover:bg-destructive cursor-pointer border bg-transparent px-4'
              onClick={() => leaveMutation.mutate({})}
              isLoading={leaveMutation.isPending}
              label={t('forum.leave_faction')}
            />
          )}
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className='mr-2 h-4 w-4' />
            {t('forum.create_post')}
          </Button>
        </div>
      </div>

      <div className='grid gap-4'>
        {posts.length === 0 ? (
          <div className='flex h-40 flex-col items-center justify-center rounded-lg border border-dashed'>
            <p className='text-muted-foreground text-sm'>{t('forum.no_posts')}</p>
          </div>
        ) : (
          posts.map((post) => (
            <Card
              key={post.id}
              className='cursor-pointer transition-colors hover:bg-zinc-50/50'
              onClick={() => navigate(`/forum/${faction}/${post.id}`)}
            >
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-xl'>{post.title}</CardTitle>
                  <span className='text-muted-foreground text-xs'>{new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
                <CardDescription className='line-clamp-2'>{post.description}</CardDescription>
                <div className='mt-2 flex items-center gap-2'>
                  <span className='text-muted-foreground text-xs'>
                    {t('forum.posted_by')}: {post.author.name}
                  </span>
                  <span className='text-muted-foreground text-xs'>•</span>
                  <span className='text-muted-foreground text-xs'>
                    {post._count.comments} {t('forum.comments')}
                  </span>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      <CreatePostDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} faction={faction as Faction} />
    </div>
  )
}
