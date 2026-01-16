import { cn } from '@/lib/cn.lib'
import Card from '@/ui/card.component'
import { trpc } from '@/utils/trpc.utils'
import { ScriptText } from '@nsmr/pixelart-react'
import { MissionStatus } from '@shared/types/gamification.types'
import { useSuspenseQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import CombatLog from '../components/combat-log.component'

export default function AdventureHistory() {
  const { t } = useTranslation()
  const { data: missions, isPending } = useSuspenseQuery(trpc.missions.history.queryOptions())
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null)
  const selectedMission = !isPending && missions.find((m) => m.id === selectedMissionId)

  return (
    <div className='flex h-full w-full gap-4 overflow-hidden pr-4'>
      <Card className='bg-background/50 flex h-full w-1/3 flex-col gap-0 overflow-hidden rounded-lg py-0 backdrop-blur-sm'>
        <div className='flex items-center gap-2 border-b p-4'>
          <ScriptText className='text-primary h-5 w-5' />
          <h2 className='font-semibold'>{t('adventure.history.title')}</h2>
        </div>
        <div className='scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent flex-1 overflow-y-auto p-2'>
          {missions.length === 0 ? (
            <div className='text-muted-foreground flex h-full items-center justify-center p-4 text-center text-sm'>
              {t('adventure.history.empty')}
            </div>
          ) : (
            <div className='flex flex-col gap-2 p-2'>
              {missions.map((mission) => (
                <button
                  key={mission.id}
                  onClick={() => setSelectedMissionId(mission.id)}
                  className={cn(
                    'hover:bg-muted/50 flex w-full cursor-pointer flex-col gap-1 rounded-lg border p-3 text-left transition-colors',
                    selectedMissionId === mission.id ? 'bg-muted border-primary/50' : 'bg-card border-transparent'
                  )}
                >
                  <div className='flex w-full items-center justify-between'>
                    <span className='font-medium'>{t(`missions.${mission.name}.name`)}</span>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-xs font-semibold',
                        mission.status === MissionStatus.COMPLETED
                          ? 'border-green-400 bg-green-400/10 text-green-400'
                          : 'border-red-400 bg-red-400/10 text-red-400'
                      )}
                    >
                      {mission.status === MissionStatus.COMPLETED ? t('common.completed') : t('common.failed')}
                    </span>
                  </div>
                  <span className='text-muted-foreground text-xs'>{dayjs(mission.completedAt).format('LLL')}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className='bg-background/50 flex h-full flex-1 flex-col gap-0 overflow-hidden rounded-lg py-0 backdrop-blur-sm'>
        {selectedMission ? (
          <>
            <div className='flex items-center justify-between border-b p-4'>
              <div className='flex flex-row items-center gap-2'>
                <span className='text-muted-foreground font-semibold'>{t('adventure.history.log_title')}: </span>
                <span className='font-semibold'>{t(`missions.${selectedMission.name}.name`)}</span>
              </div>
            </div>
            <CombatLog
              entries={[...selectedMission.combatLog].reverse()}
              className='border-none bg-transparent px-4 py-2'
            />
          </>
        ) : (
          <div className='text-muted-foreground flex h-full flex-col items-center justify-center gap-2'>
            <ScriptText className='h-12 w-12 opacity-20' />
            <p className='text-sm'>{t('adventure.history.select_mission')}</p>
          </div>
        )}
      </Card>
    </div>
  )
}
