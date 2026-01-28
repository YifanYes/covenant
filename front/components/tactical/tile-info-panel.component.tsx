'use client'

import type {
  GridPosition,
  TileState,
  TacticalUnit
} from '@shared/types/tactical-combat.types'
import { TERRAIN_CONFIG } from '@shared/constants/terrain'

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
  if (!hoveredTile || !hoveredTileState) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Hover over a tile to see info
      </div>
    )
  }

  const terrainConfig = TERRAIN_CONFIG[hoveredTileState.terrain]

  return (
    <div className="space-y-4">
      {/* Tile info */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">
          TILE
        </h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Position</span>
            <span>
              ({hoveredTile.x}, {hoveredTile.y})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Terrain</span>
            <span className="capitalize">
              {hoveredTileState.terrain.toLowerCase()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Move Cost</span>
            <span>
              {terrainConfig.movementCost === Infinity
                ? 'Blocked'
                : terrainConfig.movementCost}
            </span>
          </div>
          {terrainConfig.damagePerTurn > 0 && (
            <div className="flex justify-between text-red-500">
              <span>Damage/Turn</span>
              <span>{terrainConfig.damagePerTurn}</span>
            </div>
          )}
          {terrainConfig.statusEffect && (
            <div className="flex justify-between text-blue-500">
              <span>Effect</span>
              <span>{terrainConfig.statusEffect}</span>
            </div>
          )}
        </div>
      </div>

      {/* Unit info (if present) */}
      {hoveredUnit && (
        <div className="pt-4 border-t">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">
            {hoveredUnit.isPlayer ? 'ALLY' : 'ENEMY'}
          </h4>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  hoveredUnit.isPlayer
                    ? 'bg-blue-500 text-white'
                    : 'bg-red-500 text-white'
                }`}
              >
                {hoveredUnit.name.charAt(0)}
              </div>
              <span className="font-medium">{hoveredUnit.name}</span>
            </div>

            {/* Health bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">HP</span>
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
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">MP</span>
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
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Move</span>
                <span>{hoveredUnit.movementRange}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Range</span>
                <span>{hoveredUnit.attackRange}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Speed</span>
                <span>{hoveredUnit.speed}</span>
              </div>
            </div>

            {/* Status effects */}
            {hoveredUnit.activeEffects.length > 0 && (
              <div className="mt-2">
                <span className="text-xs text-muted-foreground">Effects:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {hoveredUnit.activeEffects.map((effect, i) => (
                    <span
                      key={i}
                      className="text-xs px-1.5 py-0.5 bg-muted rounded"
                    >
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
          Selected: ({selectedTile.x}, {selectedTile.y})
        </div>
      )}
    </div>
  )
}
