'use client'

import { useTranslation } from 'react-i18next'
import type { TacticalUnit } from '@shared/types/tactical-combat.types'
import { cn } from '@/lib/cn.lib'

interface TurnOrderDisplayProps {
  turnQueue: TacticalUnit[]
  currentTurnIndex: number
  turnNumber: number
}

// Helper to translate enemy names from "prefix|suffix" format
function translateUnitName(name: string, t: (key: string) => string): string {
  if (name.includes('|')) {
    const [prefix, suffix] = name.split('|')
    return `${t(prefix)} ${t(suffix)}`
  }
  return name
}

export default function TurnOrderDisplay({
  turnQueue,
  currentTurnIndex,
  turnNumber
}: TurnOrderDisplayProps) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-4">
      <div className="text-sm font-medium text-muted-foreground">
        Turn {turnNumber}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto">
        {turnQueue.map((unit, index) => {
          const isActive = index === currentTurnIndex
          const isPast = index < currentTurnIndex

          return (
            <div
              key={unit.id}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all',
                isActive && 'bg-primary/10 border-primary ring-2 ring-primary/30',
                isPast && 'opacity-50',
                !isActive && !isPast && 'bg-muted/50 border-border'
              )}
            >
              {/* Unit indicator */}
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                  unit.isPlayer
                    ? 'bg-blue-500 text-white'
                    : 'bg-red-500 text-white'
                )}
              >
                {translateUnitName(unit.name, t).charAt(0)}
              </div>

              {/* Unit info */}
              <div className="flex flex-col">
                <span className="text-xs font-medium truncate max-w-20">
                  {translateUnitName(unit.name, t)}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span>{unit.currentHealth}/{unit.maxHealth}</span>
                  <span>HP</span>
                </div>
              </div>

              {/* Active indicator */}
              {isActive && (
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
