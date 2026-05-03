'use client'
import { cn } from '@/lib/cn.lib'
import Separator from '@/ui/separator.component'
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
      case CombatLogType.STATUS_EFFECT:
      case CombatLogType.DOCTRINE_EFFECT:
        return Zap
      case CombatLogType.STATUS_EXPIRED:
        return Shield
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
      case CombatLogType.STATUS_EFFECT:
        return 'text-amber-500'
      case CombatLogType.DOCTRINE_EFFECT:
        return 'text-purple-500'
      case CombatLogType.STATUS_EXPIRED:
        return 'text-slate-400'
      default:
        return 'text-muted-foreground'
    }
  }

  // Helper to translate enemy name (handles prefix|suffix format)
  const translateEnemyName = (name: string | undefined): string => {
    if (!name) return t('combat.unknown_enemy')
    if (name.includes('|')) {
      const [prefix, suffix] = name.split('|')
      return `${t(prefix)} ${t(suffix)}`
    }
    return t(name)
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
        return t('combat.log.damage_to_enemy', { enemy: translateEnemyName(data.enemy as string), damage: data.damage })
      case CombatLogType.DAMAGE_TO_PLAYER:
        return t('combat.log.damage_to_player', { damage: data.damage })
      case CombatLogType.ENEMY_DEFEATED:
        return t('combat.log.enemy_defeated', { enemy: translateEnemyName(data.enemy as string) })
      case CombatLogType.MANA_REGEN:
        return t('combat.log.mana_regen', { mana: data.mana })
      case CombatLogType.PHASE_COMPLETE:
        return t('combat.phase_complete')
      case CombatLogType.STATUS_EFFECT: {
        const effectKey = (data.effect as string)?.toLowerCase() ?? 'unknown'
        const targetKey = data.target === 'player' ? 'ti' : (data.target as string)

        if (effectKey === 'doctrine_active') {
          return t('combat.log.doctrine_active', {
            effect: t(`status_effects.${effectKey}`, { defaultValue: effectKey })
          })
        }

        return t('combat.log.status_effect', {
          effect: t(`status_effects.${effectKey}`, { defaultValue: effectKey }),
          target: targetKey === 'ti' ? 'ti' : translateEnemyName(targetKey)
        })
      }
      case CombatLogType.DOCTRINE_EFFECT: {
        const doctrineId = (data.doctrine as string)?.toLowerCase() ?? 'unknown'
        const effectName = (data.effect as string)?.toLowerCase()
        const doctrineName = t(`doctrines.${doctrineId}.name`, { defaultValue: doctrineId })

        // If no effect specified, just show the doctrine name
        if (!effectName) {
          return t('combat.log.doctrine_cast', { doctrine: doctrineName })
        }

        return t('combat.log.doctrine_effect', {
          doctrine: doctrineName,
          effect: t(`status_effects.${effectName}`, { defaultValue: effectName })
        })
      }
      case CombatLogType.STATUS_EXPIRED: {
        const effectKey = (data.effect as string).toLowerCase()
        return t('combat.log.status_expired', {
          effect: t(`status_effects.${effectKey}`, { defaultValue: effectKey })
        })
      }
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
        <p className="text-muted-foreground text-center text-sm italic">{t('combat.log.empty')}</p>
      ) : (
        entries.map((entry, index) => {
          const Icon = getEntryIcon(entry.type)
          const isEndOfTurn = entry.type === CombatLogType.PLAYER_ATTACK && index < entries.length - 1

          return (
            <div key={index} className="flex flex-col gap-2">
              <div className="flex items-start gap-3">
                <div className={cn('mt-0.5', getEntryColor(entry.type))}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-foreground/90 text-sm">{formatEntry(entry)}</span>
              </div>
              {isEndOfTurn && <Separator className="my-2" />}
            </div>
          )
        })
      )}
    </div>
  )
}
