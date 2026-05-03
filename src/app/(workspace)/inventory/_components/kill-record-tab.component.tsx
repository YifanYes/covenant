'use client'
import { trpcOptions } from '@/utils/trpc.utils'
import { useSuspenseQuery } from '@tanstack/react-query'
import KillRecordList from './kill-record-list.component'
import KillRecordStats from './kill-record-stats.component'
import TierProgressCard from './tier-progress-card.component'

export default function KillRecordTab() {
  const { data: killRecordData } = useSuspenseQuery(trpcOptions.killRecord.getKillRecord.queryOptions())
  const { data: statsData } = useSuspenseQuery(trpcOptions.killRecord.getKillStats.queryOptions())

  return (
    <div className="flex h-full flex-col gap-4">
      <TierProgressCard />
      <KillRecordStats stats={statsData} />
      <KillRecordList enemies={killRecordData.enemies} />
    </div>
  )
}
