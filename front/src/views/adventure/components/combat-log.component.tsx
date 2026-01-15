import { Separator } from '@/ui'
import { cn } from '@/lib/cn.lib'
import { Alert, Battery, Bullseye, Flag, Heart, Shield, Trophy, Zap } from '@nsmr/pixelart-react'
import { CombatLogType, type CombatLogEntry } from '@shared/types/gamification.types'
import { useTranslation } from 'react-i18next'

interface CombatLogProps {
  entries: CombatLogEntry[]
  className?: string
}

export default function CombatLog({ entries, className }: CombatLogProps) {
  const { t } = useTranslation()

  const getEntryIcon = (type: CombatLogEntry['type']) => {
    switch (type) {
      case CombatLogType.PLAYER_ATTACK:
        return Zap
      case CombatLogType.PLAYER_HITS:
        return Bullseye
      case CombatLogType.ENEMY_ATTACKS:
        return Alert
      case CombatLogType.ENEMY_DEFENDS:
      case CombatLogType.PLAYER_DEFENDS:
        return Shield
      case CombatLogType.DAMAGE_TO_ENEMY:
        return Bullseye
      case CombatLogType.ENEMY_DEFEATED:
        return Trophy
      case CombatLogType.DAMAGE_TO_PLAYER:
        return Heart
      case CombatLogType.MANA_REGEN:
        return Battery
      case CombatLogType.PHASE_COMPLETE:
        return Flag
      default:
        return Zap
    }
  }

  const getEntryColor = (type: CombatLogEntry['type']) => {
    switch (type) {
      case CombatLogType.PLAYER_ATTACK:
      case CombatLogType.PLAYER_HITS:
        return 'text-blue-500'
      case CombatLogType.ENEMY_ATTACKS:
        return 'text-orange-500'
      case CombatLogType.ENEMY_DEFENDS:
      case CombatLogType.PLAYER_DEFENDS:
        return 'text-slate-400'
      case CombatLogType.DAMAGE_TO_ENEMY:
        return 'text-emerald-500'
      case CombatLogType.ENEMY_DEFEATED:
        return 'text-emerald-500'
      case CombatLogType.DAMAGE_TO_PLAYER:
        return 'text-red-500'
      case CombatLogType.MANA_REGEN:
        return 'text-purple-500'
      case CombatLogType.PHASE_COMPLETE:
        return 'text-yellow-500'
      default:
        return 'text-muted-foreground'
    }
  }

  const formatEntry = (entry: CombatLogEntry): string => {
    const data = entry.data
    switch (entry.type) {
      case CombatLogType.PLAYER_ATTACK:
        return t('combat.log.player_attack', { dice: data.dice })
      case CombatLogType.PLAYER_HITS:
        return t('combat.log.player_hits', { hits: data.hits })
      case CombatLogType.ENEMY_DEFENDS:
        return t('combat.log.enemy_defends', { blocks: data.blocks })
      case CombatLogType.ENEMY_ATTACKS:
        return t('combat.log.enemy_attacks', { hits: data.hits })
      case CombatLogType.PLAYER_DEFENDS:
        return t('combat.log.player_defends', { blocks: data.blocks })
      case CombatLogType.DAMAGE_TO_ENEMY:
        return t('combat.log.damage_to_enemy', { enemy: t(data.enemy as string), damage: data.damage })
      case CombatLogType.DAMAGE_TO_PLAYER:
        return t('combat.log.damage_to_player', { damage: data.damage })
      case CombatLogType.ENEMY_DEFEATED:
        return t('combat.log.enemy_defeated', { enemy: t(data.enemy as string) })
      case CombatLogType.MANA_REGEN:
        return t('combat.log.mana_regen', { mana: data.mana })
      case CombatLogType.PHASE_COMPLETE:
        return t('combat.phase_complete')
      default:
        return JSON.stringify(data)
    }
  }

  return (
    <div
      className={cn(
        'bg-muted/30 flex flex-col gap-2 overflow-y-auto rounded-lg border p-4',
        'scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent',
        className
      )}
    >
      {entries.length === 0 ? (
        <p className='text-muted-foreground text-center text-sm italic'>{t('combat.log.empty')}</p>
      ) : (
        entries.map((entry, index) => {
          const Icon = getEntryIcon(entry.type)
          const isEndOfTurn = entry.type === CombatLogType.PLAYER_ATTACK && index < entries.length - 1

          return (
            <div key={index} className='flex flex-col gap-2'>
              <div className='flex items-start gap-3'>
                <div className={cn('mt-0.5', getEntryColor(entry.type))}>
                  <Icon className='h-4 w-4' />
                </div>
                <span className='text-foreground/90 text-sm'>{formatEntry(entry)}</span>
              </div>
              {isEndOfTurn && <Separator className='my-2' />}
            </div>
          )
        })
      )}
    </div>
  )
}
