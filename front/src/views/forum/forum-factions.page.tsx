import LoaderButton from '@/common/loader-button.component'
import { cn } from '@/lib/cn.lib'
import Card, { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/card.component'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { Faction } from '@shared/schemas/forum.schemas'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

export default function ForumFactions() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: character } = useSuspenseQuery(trpc.character.getCurrentClass.queryOptions())
  const { data: factions } = useSuspenseQuery(trpc.forum.getFactions.queryOptions())

  const joinMutation = useMutation(
    trpc.forum.joinFaction.mutationOptions({
      onSuccess: (data) => {
        navigate(`/forum/${data.factionName}`)
        queryClient.invalidateQueries({ queryKey: trpc.character.getCurrentClass.queryKey() })
      }
    })
  )

  const currentFaction = character?.factionName

  useEffect(() => {
    if (currentFaction && currentFaction !== '') {
      navigate(`/forum/${currentFaction}`, { replace: true })
    }
  }, [currentFaction, navigate])

  return (
    <div className='flex flex-col gap-6 p-6'>
      <div className='flex items-center justify-between'>
        <div className='flex flex-col gap-2'>
          <h1 className='text-3xl font-bold tracking-tight'>{t('forum.factions_title')}</h1>
          {currentFaction && currentFaction !== '' && (
            <p className='text-muted-foreground'>
              {t('forum.already_in_faction', { faction: t(`factions.${currentFaction}`) })}
            </p>
          )}
        </div>
      </div>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {factions.map((faction) => (
          <Card key={faction} className='flex flex-col'>
            <CardHeader>
              <CardTitle>{t(`factions.${faction}`)}</CardTitle>
              <CardDescription>{t(`factions.${faction}_description`)}</CardDescription>
            </CardHeader>
            <CardContent className='flex-1'>{/* Optional: Add faction image or more details */}</CardContent>
            <CardFooter>
              <LoaderButton
                className={cn(
                  'w-full cursor-pointer',
                  currentFaction === faction &&
                    'bg-background hover:bg-primary hover:text-primary-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 border shadow-xs'
                )}
                onClick={() => {
                  if (currentFaction === faction) {
                    navigate(`/forum/${faction}`)
                  } else {
                    joinMutation.mutate({ faction: faction as Faction })
                  }
                }}
                isLoading={joinMutation.isPending}
                label={currentFaction === faction ? t('forum.go_to_forum') : t('forum.join_faction')}
              />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
