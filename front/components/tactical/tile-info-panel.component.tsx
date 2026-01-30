'use client'

import { Heart, SpeedFast, Zap } from '@nsmr/pixelart-react'
import { useTranslation } from 'react-i18next'

import { TERRAIN_CONFIG } from '@shared/constants/terrain'
import type { GridPosition, TacticalUnit, TileState } from '@shared/types/tactical-combat.types'

// Helper to translate enemy names from "prefix|suffix" format
function translateUnitName(name: string, t: (key: string) => string): string {
  if (name.includes('|')) {
    const [prefix, suffix] = name.split('|')
    return `${t(prefix)} ${t(suffix)}`
  }
  return name
}

interface TileInfoPanelProps {
  hoveredTile: GridPosition | null
  hoveredTileState: TileState | null
  hoveredUnit: TacticalUnit | null
  selectedTile: GridPosition | null
}

export default function TileInfoPanel({
  hoveredTile,
  hoveredTileState,
  hoveredUnit,
  selectedTile
}: TileInfoPanelProps) {
  const { t } = useTranslation()

  if (!hoveredTile || !hoveredTileState) {
    return <div className="text-sm text-muted-foreground text-center py-4">{t('tactical.tile_info.hover_hint')}</div>
  }

  const terrainConfig = TERRAIN_CONFIG[hoveredTileState.terrain]

  return (
    <div className="space-y-4">
      {/* Tile info */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">{t('tactical.tile_info.tile').toUpperCase()}</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('tactical.tile_info.position')}</span>
            <span>
              ({hoveredTile.x}, {hoveredTile.y})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('tactical.tile_info.terrain')}</span>
            <span className="capitalize">{hoveredTileState.terrain.toLowerCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('tactical.tile_info.move_cost')}</span>
            <span>{terrainConfig.movementCost === Infinity ? t('tactical.tile_info.blocked') : terrainConfig.movementCost}</span>
          </div>
          {terrainConfig.damagePerTurn > 0 && (
            <div className="flex justify-between text-red-500">
              <span>{t('tactical.tile_info.damage_per_turn')}</span>
              <span>{terrainConfig.damagePerTurn}</span>
            </div>
          )}
          {terrainConfig.statusEffect && (
            <div className="flex justify-between text-blue-500">
              <span>{t('tactical.tile_info.effect')}</span>
              <span>{terrainConfig.statusEffect}</span>
            </div>
          )}
        </div>
      </div>

      {/* Unit info (if present) */}
      {hoveredUnit && (
        <div className="pt-4 border-t">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">
            {hoveredUnit.isPlayer ? t('tactical.tile_info.ally').toUpperCase() : t('tactical.tile_info.enemy').toUpperCase()}
          </h4>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  hoveredUnit.isPlayer ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'
                }`}
              >
                {translateUnitName(hoveredUnit.name, t).charAt(0)}
              </div>
              <span className="font-medium">{translateUnitName(hoveredUnit.name, t)}</span>
            </div>

            {/* Health bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Heart className="h-4 w-4 text-emerald-500" />
                  {t('inventory.health')}
                </span>
                <span>
                  {hoveredUnit.currentHealth}/{hoveredUnit.maxHealth}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    hoveredUnit.currentHealth / hoveredUnit.maxHealth > 0.6
                      ? 'bg-green-500'
                      : hoveredUnit.currentHealth / hoveredUnit.maxHealth > 0.3
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                  style={{
                    width: `${(hoveredUnit.currentHealth / hoveredUnit.maxHealth) * 100}%`
                  }}
                />
              </div>
            </div>

            {/* Mana bar (if has mana) */}
            {hoveredUnit.maxMana > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Zap className="h-4 w-4 text-blue-400" />
                    {t('inventory.mana')}
                  </span>
                  <span>
                    {hoveredUnit.currentMana}/{hoveredUnit.maxMana}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{
                      width: `${(hoveredUnit.currentMana / hoveredUnit.maxMana) * 100}%`
                    }}
                  />
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('tactical.tile_info.move')}</span>
                <span>{hoveredUnit.movementRange}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('tactical.tile_info.range')}</span>
                <span>{hoveredUnit.attackRange}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <SpeedFast className="h-4 w-4 text-amber-400" />
                  {t('inventory.stats.speed')}
                </span>
                <span>{hoveredUnit.speed}</span>
              </div>
            </div>

            {/* Status effects */}
            {hoveredUnit.activeEffects.length > 0 && (
              <div className="mt-2">
                <span className="text-xs text-muted-foreground">{t('tactical.tile_info.effects')}:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {hoveredUnit.activeEffects.map((effect, i) => (
                    <span key={i} className="text-xs px-1.5 py-0.5 bg-muted rounded">
                      {effect.effect}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected tile indicator */}
      {selectedTile && (
        <div className="pt-4 border-t text-xs text-muted-foreground">
          {t('tactical.tile_info.selected')}: ({selectedTile.x}, {selectedTile.y})
        </div>
      )}
    </div>
  )
}
