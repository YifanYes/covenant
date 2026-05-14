'use client'
import LoaderButton from '@/common/loader-button.component'
import { panelChrome, rpgDialogContent } from '@/components/rpg/rpg-styles'
import { cn } from '@/lib/cn.lib'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { Badge } from '@/ui/badge.component'
import Dialog, {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/ui/dialog.component'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { Cancel as Close, Flag, Money } from 'pixelarticons/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { QuestTemplate } from '@shared/constants/quests'

type QuestWithStatus = QuestTemplate & { isActive: boolean; activeCharacterQuestId: string | null }

const difficultyBadge: Record<string, string> = {
  EASY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  NORMAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  HARD: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
}

export default function QuestsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [selectedQuest, setSelectedQuest] = useState<QuestWithStatus | null>(null)

  const { data: characterData } = useSuspenseQuery(trpcOptions.character.getCurrentClass.queryOptions())
  const characterId = characterData?.id

  const { data: quests } = useSuspenseQuery(trpcOptions.quest.list.queryOptions({ characterId }))

  const startMutation = useMutation(
    trpcOptions.quest.start.mutationOptions({
      onSuccess: (result) => {
        toast.success(t('quests.started'))
        queryClient.invalidateQueries({ queryKey: trpcOptions.quest.list.queryKey() })
        setSelectedQuest(null)
        router.push(`/quests/${result.quest.id}`)
      },
      onError: (error) => {
        toast.error(t('quests.error.start'), { description: error.message })
      }
    })
  )

  const hasActiveQuest = quests?.some((q) => q.isActive)

  return (
    <div className="flex h-full w-full flex-col overflow-auto p-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold">{t('quests.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('quests.subtitle')}</p>
        </div>

        {/* Quest Board Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quests?.map((quest) => (
            <button
              key={quest.id}
              type="button"
              onClick={() => setSelectedQuest(quest)}
              className={cn(
                panelChrome,
                'group cursor-pointer overflow-hidden text-left transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                quest.isActive && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
              )}
            >
              {/* Image placeholder */}
              <div className="relative flex h-36 items-center justify-center overflow-hidden bg-muted">
                <Flag className="h-14 w-14 text-muted-foreground/20 transition-transform duration-200 group-hover:scale-110" />
                {quest.isActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <Badge className="border-primary/40 bg-primary/15 text-primary text-xs">
                      {t('quests.status.active')}
                    </Badge>
                  </div>
                )}
                <span
                  className={cn(
                    'absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium',
                    difficultyBadge[quest.difficulty] ?? ''
                  )}
                >
                  {t(`quests.difficulty.${quest.difficulty.toLowerCase()}`)}
                </span>
              </div>

              {/* Card body */}
              <div className="p-4">
                <h3 className="mb-2 text-sm font-semibold leading-tight">{t(quest.name)}</h3>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Flag className="h-3 w-3 shrink-0" />
                    {t('quests.kill_enemies', { count: quest.objective.target })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Money className="h-3 w-3 shrink-0 text-yellow-500" />
                    {quest.reward.gold.min}–{quest.reward.gold.max}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quest Detail Modal */}
      <Dialog open={!!selectedQuest} onOpenChange={(open) => !open && setSelectedQuest(null)}>
        {selectedQuest && (
          <DialogContent className={cn(rpgDialogContent, 'overflow-hidden p-0')} showCloseButton={false}>
            {/* Full-bleed image header */}
            <div className="relative flex h-44 items-center justify-center bg-muted">
              <Flag className="h-20 w-20 text-muted-foreground/20" />
              {selectedQuest.isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                  <Badge className="border-primary/40 bg-primary/15 text-primary">
                    {t('quests.status.active')}
                  </Badge>
                </div>
              )}
              <span
                className={cn(
                  'absolute left-4 top-4 rounded-full px-2.5 py-1 text-xs font-medium',
                  difficultyBadge[selectedQuest.difficulty] ?? ''
                )}
              >
                {t(`quests.difficulty.${selectedQuest.difficulty.toLowerCase()}`)}
              </span>
              <DialogClose className="absolute right-3 top-3 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/30 opacity-80 transition-opacity hover:opacity-100">
                <Close className="h-4 w-4 text-white" />
              </DialogClose>
            </div>

            {/* Modal content */}
            <div className="space-y-4 p-6">
              <DialogHeader>
                <DialogTitle className="text-xl">{t(selectedQuest.name)}</DialogTitle>
                <DialogDescription className="leading-relaxed">
                  {t(selectedQuest.description)}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3">
                <div className={cn(panelChrome, 'p-3')}>
                  <p className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wider">
                    {t('quests.objective')}
                  </p>
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <Flag className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    {t('quests.kill_enemies', { count: selectedQuest.objective.target })}
                  </p>
                </div>
                <div className={cn(panelChrome, 'p-3')}>
                  <p className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wider">
                    {t('quests.reward')}
                  </p>
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <Money className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
                    {selectedQuest.reward.gold.min}–{selectedQuest.reward.gold.max}
                  </p>
                </div>
              </div>

              <DialogFooter>
                {selectedQuest.isActive ? (
                  <LoaderButton
                    onClick={() => {
                      const questRecordId = selectedQuest.activeCharacterQuestId
                      setSelectedQuest(null)
                      if (questRecordId) {
                        router.push(`/quests/${questRecordId}`)
                      }
                    }}
                    isLoading={false}
                    label={t('quests.continue')}
                  />
                ) : (
                  <LoaderButton
                    onClick={() => {
                      if (characterId) {
                        startMutation.mutate({ questId: selectedQuest.id, characterId })
                      }
                    }}
                    isLoading={startMutation.isPending}
                    disabled={!!hasActiveQuest}
                    label={hasActiveQuest ? t('quests.already_active') : t('quests.start')}
                  />
                )}
              </DialogFooter>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
