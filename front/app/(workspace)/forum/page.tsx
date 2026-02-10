'use client'
import LoaderButton from '@/common/loader-button.component'
import OnboardingRedirect from '@/components/shared/onboarding-redirect'
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
import Card, { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/card.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { Loader } from '@nsmr/pixelart-react'
import { Faction } from '@shared/constants/activities'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { factionToKebab } from './_utils/faction-slug.utils'

export default function ForumFactionsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { data: character } = useSuspenseQuery(trpcOptions.character.getCurrentClass.queryOptions())
  const { data: factions } = useSuspenseQuery(trpcOptions.forum.getFactions.queryOptions())

  const joinMutation = useMutation({
    ...trpcOptions.forum.joinFaction.mutationOptions(),
    onSuccess: (data) => {
      router.push(`/forum/${factionToKebab(data.factionName)}`)
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() })
    }
  })

  const currentFaction = character?.factionName
  const hasFaction = currentFaction && currentFaction !== ''

  useEffect(() => {
    if (hasFaction) {
      router.replace(`/forum/${factionToKebab(currentFaction)}`)
    }
  }, [hasFaction, currentFaction, router])

  if (!character) {
    return <OnboardingRedirect />
  }

  if (hasFaction) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <Loader className='h-10 w-10 animate-spin' />
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-6 p-6'>
      <div className='flex items-center justify-between'>
        <div className='flex flex-col gap-2'>
          <h1 className='text-3xl font-bold tracking-tight'>{t('forum.factions_title')}</h1>
        </div>
      </div>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {factions.map((faction) => (
          <Card key={faction} className='flex flex-col'>
            <CardHeader>
              <CardTitle>{t(`factions.${faction}`)}</CardTitle>
              <CardDescription>{t(`factions.${faction}_description`)}</CardDescription>
            </CardHeader>
            <CardContent className='flex-1' />
            <CardFooter>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className='w-full cursor-pointer'>{t('forum.join_faction')}</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('forum.join_faction_confirm')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('forum.join_faction_description')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <LoaderButton
                        onClick={() => joinMutation.mutate({ faction: faction as Faction })}
                        isLoading={joinMutation.isPending}
                        label={t('forum.join_faction')}
                      />
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
