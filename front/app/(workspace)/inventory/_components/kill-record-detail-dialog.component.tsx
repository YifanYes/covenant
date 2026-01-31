'use client'
import CombatLog from '@/app/(workspace)/map/_components/combat-log.component'
import { cn } from '@/lib/cn.lib'
import Dialog, { DialogContent, DialogHeader, DialogTitle } from '@/ui/dialog.component'
import { EnemyType, getEnemy } from '@shared/constants/enemies'
import type { CombatLogEntry } from '@shared/types/gamification.types'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'

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

interface KillRecordDetailDialogProps {
  enemy: DefeatedEnemy | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function KillRecordDetailDialog({ enemy, open, onOpenChange }: KillRecordDetailDialogProps) {
  const { t } = useTranslation()

  if (!enemy) return null

  const template = getEnemy(enemy.templateId)
  if (!template) return null

  const getTypeBadgeColor = () => {
    switch (template.type) {
      case EnemyType.BOSS:
        return 'bg-red-600 text-white'
      case EnemyType.ELITE:
        return 'bg-purple-600 text-white'
      default:
        return 'bg-slate-600 text-white'
    }
  }

  const getEnemyName = () => {
    if (enemy.namePrefix && enemy.nameSuffix) {
      const prefix = t(enemy.namePrefix)
      const suffix = t(enemy.nameSuffix)
      return `${prefix} ${suffix}`
    }
    return t(template.name)
  }

  const getTimeAgo = () => {
    if (!enemy.defeatedAt) return t('inventory.kill_record.unknown_time')
    return formatDistanceToNow(new Date(enemy.defeatedAt), { addSuffix: true })
  }

  const combatLogEntries = (enemy.combatLog as CombatLogEntry[]) || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Image
              src={`/assets/enemies/${template.imageId}.png`}
              alt={t(template.name)}
              width={80}
              height={80}
              className="h-20 w-20 rounded-lg object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <div className="flex flex-col gap-1">
              <span>{getEnemyName()}</span>
              <div className="flex items-center gap-2">
                <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', getTypeBadgeColor())}>
                  {template.type}
                </span>
                <span className="text-muted-foreground text-xs font-normal">{getTimeAgo()}</span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="border-border bg-muted/30 flex flex-col items-center rounded-lg border p-2">
            <span className="text-lg font-bold">{enemy.maxHealth}</span>
            <span className="text-muted-foreground text-[10px]">{t('inventory.kill_record.max_health')}</span>
          </div>
          <div className="border-border bg-muted/30 flex flex-col items-center rounded-lg border p-2">
            <span className="text-lg font-bold">{enemy.turnsElapsed}</span>
            <span className="text-muted-foreground text-[10px]">{t('inventory.kill_record.turns')}</span>
          </div>
          <div className="border-border bg-muted/30 flex flex-col items-center rounded-lg border p-2">
            <span className="text-lg font-bold text-emerald-500">{enemy.damageDealt}</span>
            <span className="text-muted-foreground text-[10px]">{t('inventory.kill_record.damage_dealt_short')}</span>
          </div>
          <div className="border-border bg-muted/30 flex flex-col items-center rounded-lg border p-2">
            <span className="text-lg font-bold text-red-500">{enemy.damageTaken}</span>
            <span className="text-muted-foreground text-[10px]">
              {t('inventory.kill_record.damage_received_short')}
            </span>
          </div>
        </div>

        {/* Combat Log */}
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <h3 className="shrink-0 text-sm font-medium">{t('inventory.kill_record.combat_log')}</h3>
          <CombatLog entries={combatLogEntries} className="min-h-0 flex-1 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
