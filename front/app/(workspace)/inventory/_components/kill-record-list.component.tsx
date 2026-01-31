'use client'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import KillRecordCard from './kill-record-card.component'
import KillRecordDetailDialog from './kill-record-detail-dialog.component'

interface DefeatedEnemy {
  id: string
  templateId: string
  namePrefix: string
  nameSuffix: string
  maxHealth: number
  turnsElapsed: number
  damageDealt: number
  damageTaken: number
  criticalHits: number
  defeatedAt: string | null
  combatLog: unknown
}

interface KillRecordListProps {
  enemies: DefeatedEnemy[]
}

export default function KillRecordList({ enemies }: KillRecordListProps) {
  const { t } = useTranslation()
  const [selectedEnemy, setSelectedEnemy] = useState<DefeatedEnemy | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleCardClick = (enemy: DefeatedEnemy) => {
    setSelectedEnemy(enemy)
    setDialogOpen(true)
  }

  if (enemies.length === 0) {
    return (
      <div className='text-muted-foreground flex flex-1 items-center justify-center p-8 text-center text-sm'>
        {t('inventory.kill_record.empty')}
      </div>
    )
  }

  return (
    <>
      <div className='flex flex-col gap-2 overflow-auto'>
        {enemies.map((enemy) => (
          <KillRecordCard key={enemy.id} enemy={enemy} onClick={() => handleCardClick(enemy)} />
        ))}
      </div>

      <KillRecordDetailDialog enemy={selectedEnemy} open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
