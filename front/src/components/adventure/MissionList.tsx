import { trpc } from '@/utils/trpc.utils'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import ActiveMissionWidget from './ActiveMissionWidget'
import MissionCard from './MissionCard'

export default function MissionList() {
  const { t } = useTranslation()
  const { data } = useSuspenseQuery(trpc.missions.list.queryOptions())
  const { data: activeMission } = useSuspenseQuery(trpc.missions.getActive.queryOptions())

  const missionsByTier = data.missions.reduce(
    (acc, mission) => {
      if (activeMission?.template && mission.id === activeMission.template.id) {
        return acc
      }

      const tier = mission.requiredTier
      if (!acc[tier]) acc[tier] = []
      acc[tier].push(mission)
      return acc
    },
    {} as Record<number, typeof data.missions>
  )

  const tiers = Object.keys(missionsByTier)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <div className='flex flex-col gap-6'>
      {activeMission && <ActiveMissionWidget mission={activeMission.mission} template={activeMission.template} />}

      {tiers.map((tier) => (
        <div key={tier} className='flex flex-col gap-3'>
          <h2 className='text-xl font-semibold'>{t('missions.tier', { tier })}</h2>

          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {missionsByTier[tier].map((mission) => (
              <MissionCard key={mission.id} mission={mission} isLocked={false} />
            ))}
          </div>
        </div>
      ))}

      {data.missions.length === 0 && !activeMission && (
        <div className='flex flex-col items-center justify-center py-12 text-center'>
          <p className='text-muted-foreground'>{t('adventure.no_missions')}</p>
        </div>
      )}
    </div>
  )
}
