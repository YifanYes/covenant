'use client'
import Button from '@/ui/button.component'
import { trpcOptions } from '@/utils/trpc.utils'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Plus, Target } from 'pixelarticons/react'
import { useTranslation } from 'react-i18next'
import CreateAreaDialog from './_components/areas/create-area-dialog.component'
import UpdateAreaDialog from './_components/areas/update-area-dialog.component'
import CreateObjectiveDialog from './_components/create-objective-dialog.component'
import ObjectiveCard from './_components/objective-card.component'

export default function Objectives() {
  const { t } = useTranslation()
  const { data: objectivesData } = useSuspenseQuery(trpcOptions.objectives.getAll.queryOptions())
  const { data: areasData } = useSuspenseQuery(trpcOptions.areas.getAll.queryOptions())

  return (
    <div className="flex w-full flex-col gap-y-16 p-6">
      <section className="flex flex-col gap-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{t('areas.title')}</h1>
          <CreateAreaDialog />
        </div>
        <div className="flex flex-wrap gap-2">
          {areasData.areas.map((area) => (
            <UpdateAreaDialog key={area.id} area={area} />
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{t('objectives.title')}</h1>
          <CreateObjectiveDialog />
        </div>
        {objectivesData.objectives?.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-6 py-12 text-center">
            <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
              <Target className="text-muted-foreground h-8 w-8" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold">{t('objectives.empty.title')}</h3>
              <p className="text-muted-foreground max-w-xs text-sm">{t('objectives.empty.description')}</p>
            </div>
            <CreateObjectiveDialog
              trigger={
                <Button>
                  <Plus />
                  <span>{t('objectives.empty.action')}</span>
                </Button>
              }
            />
          </div>
        ) : (
          <div className="3xl:grid-cols-6 grid grid-cols-1 gap-4 py-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-5">
            {objectivesData.objectives?.map((objective) => (
              <ObjectiveCard key={objective.id} objective={objective} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
