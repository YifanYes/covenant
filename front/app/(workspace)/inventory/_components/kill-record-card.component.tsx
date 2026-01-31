'use client'
import { cn } from '@/lib/cn.lib'
import { EnemyType, getEnemy } from '@shared/constants/enemies'
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

interface KillRecordCardProps {
  enemy: DefeatedEnemy
  onClick: () => void
}

export default function KillRecordCard({ enemy, onClick }: KillRecordCardProps) {
  const { t } = useTranslation()
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

  return (
    <button
      onClick={onClick}
      className={cn(
        'border-border flex w-full cursor-pointer gap-3 overflow-hidden rounded-lg border p-3 text-left transition-all',
        'hover:bg-muted/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none'
      )}
    >
      {/* Enemy Portrait */}
      <div className='shrink-0'>
        <Image
          src={`/assets/enemies/${template.imageId}.png`}
          alt={t(template.name)}
          width={64}
          height={64}
          className='h-16 w-16 rounded-lg object-cover'
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>

      {/* Enemy Info */}
      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        <div className='flex items-center justify-between gap-2'>
          <span className='truncate text-sm font-medium'>{getEnemyName()}</span>
          <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium', getTypeBadgeColor())}>
            {template.type}
          </span>
        </div>

        <div className='text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs'>
          <span>
            <span className='text-emerald-500'>{enemy.damageDealt}</span>{' '}
            {t('inventory.kill_record.damage_dealt_short')}
          </span>
          <span>
            <span className='text-red-500'>{enemy.damageTaken}</span>{' '}
            {t('inventory.kill_record.damage_received_short')}
          </span>
        </div>

        <span className='text-muted-foreground text-[10px]'>{getTimeAgo()}</span>
      </div>
    </button>
  )
}
