'use client'
import { useTutorialTrigger } from '@/hooks/use-tutorial-trigger'
import type { Objective } from '@/types/models.types'
import Button from '@/ui/button.component'
import { trpcOptions } from '@/utils/trpc.utils'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Inbox, Plus, Target } from 'pixelarticons/react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AreaFilterChip from './_components/areas/area-filter-chip.component'
import CreateAreaDialog from './_components/areas/create-area-dialog.component'
import CreateObjectiveDialog from './_components/create-objective-dialog.component'
import FirstQuestChecklist from './_components/first-quest-checklist.component'
import ObjectiveCard from './_components/objective-card.component'

export default function Objectives() {
  const { t } = useTranslation()
  useTutorialTrigger('mana')
  const { data: objectivesData } = useSuspenseQuery(trpcOptions.objectives.getAll.queryOptions())
  const { data: areasData } = useSuspenseQuery(trpcOptions.areas.getAll.queryOptions())

  const [selectedAreaPublicId, setSelectedAreaPublicId] = useState<string | null>(null)

  const objectives = useMemo(
    () => (objectivesData.objectives ?? []) as Objective[],
    [objectivesData.objectives]
  )
  const areas = areasData.areas ?? []

  const countByArea = useMemo(() => {
    const map = new Map<string, number>()
    for (const obj of objectives) {
      for (const area of obj.areas ?? []) {
        map.set(area.publicId, (map.get(area.publicId) ?? 0) + 1)
      }
    }
    return map
  }, [objectives])

  const filteredObjectives = useMemo(() => {
    if (selectedAreaPublicId === null) return objectives
    return objectives.filter((obj) => obj.areas?.some((a) => a.publicId === selectedAreaPublicId))
  }, [objectives, selectedAreaPublicId])

  const hasObjectives = objectives.length > 0
  const hasFilteredObjectives = filteredObjectives.length > 0

  return (
    <div className="flex w-full flex-col gap-y-16 p-6">
      <FirstQuestChecklist />
      <section className="flex flex-col gap-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{t('areas.title')}</h1>
          <CreateAreaDialog />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedAreaPublicId(null)}
            aria-pressed={selectedAreaPublicId === null}
            className={`border-foreground/30 inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm transition-all duration-200 ${
              selectedAreaPublicId === null
                ? 'bg-foreground text-background ring-foreground/40 scale-105 shadow-sm ring-2'
                : 'bg-background hover:bg-foreground/5 opacity-80 hover:opacity-100'
            }`}
          >
            <Inbox className="size-4" />
            <span>{t('objectives.filter.all')}</span>
            <span
              className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-semibold ${
                selectedAreaPublicId === null ? 'bg-background/20' : 'bg-foreground/10'
              }`}
            >
              {objectives.length}
            </span>
          </button>
          {areas.map((area) => (
            <AreaFilterChip
              key={area.publicId}
              area={area}
              count={countByArea.get(area.publicId) ?? 0}
              selected={selectedAreaPublicId === area.publicId}
              onSelect={() => setSelectedAreaPublicId(area.publicId)}
            />
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{t('objectives.title')}</h1>
          <CreateObjectiveDialog />
        </div>
        {!hasObjectives ? (
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
        ) : !hasFilteredObjectives ? (
          <div className="border-foreground/15 flex min-h-48 flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-10 text-center">
            <Target className="text-muted-foreground h-8 w-8" />
            <p className="text-muted-foreground max-w-xs text-sm">{t('objectives.filter.empty_for_area')}</p>
            <Button variant="outline" onClick={() => setSelectedAreaPublicId(null)}>
              {t('objectives.filter.all')}
            </Button>
          </div>
        ) : (
          <div className="3xl:grid-cols-6 grid grid-cols-1 gap-4 py-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-5">
            {filteredObjectives.map((objective) => (
              <ObjectiveCard key={objective.publicId} objective={objective} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
