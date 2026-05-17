'use client'

import { cn } from '@/lib/cn.lib'
import { Faction } from '@/shared/constants/factions.constants'
import Label from '@/ui/label.component'
import Tooltip, { TooltipContent, TooltipTrigger } from '@/ui/tooltip.component'
import { useTranslation } from 'react-i18next'

const FACTION_COLORS: Record<Faction, string> = {
  [Faction.HOLY_KNIGHTS]: '#8c7d4b',
  [Faction.LEGION]: '#4a3b54',
  [Faction.ALCHEMISTS_LEAGUE]: '#2a414a',
  [Faction.DEATH_MARCH]: '#555757',
  [Faction.CRIMSON_INQUISITION]: '#8c4b50',
  [Faction.BLOOD_PACT]: '#8c1c1c'
}

interface FactionColorSelectorProps {
  value: Faction
  onChange: (faction: Faction) => void
  className?: string
}

export default function FactionColorSelector({ value, onChange, className }: FactionColorSelectorProps) {
  const { t } = useTranslation()

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-col gap-2">
        <Label>{t('settings.faction_theme_label')}</Label>
        <span className="text-muted-foreground text-xs uppercase tracking-medium">{t(`factions.${value}`)}</span>
      </div>
      <div className="flex flex-wrap gap-4">
        {Object.values(Faction).map((f) => {
          const isActive = value === f
          const factionName = t(`factions.${f}`)
          return (
            <Tooltip key={f}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onChange(f)}
                  className={cn(
                    'group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95',
                    isActive
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                      : 'hover:ring-2 hover:ring-muted-foreground/30 hover:ring-offset-2 hover:ring-offset-background'
                  )}
                  type="button"
                >
                  <span
                    className="h-10 w-10 rounded-full shadow-sm ring-1 ring-black/10"
                    style={{ backgroundColor: FACTION_COLORS[f] }}
                  />
                  {isActive && (
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground shadow-sm">
                      ✓
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>{factionName}</TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}
