'use client'

import dynamic from 'next/dynamic'
import { useTacticalCombatStore } from '@/stores/tactical-combat.store'
import TurnOrderDisplay from './turn-order-display.component'
import ActionMenu from './action-menu.component'
import TileInfoPanel from './tile-info-panel.component'

// Dynamic import for Phaser canvas (SSR-safe)
const TacticalCanvas = dynamic(
  () => import('./tactical-canvas.component'),
  { ssr: false }
)

interface TacticalCombatViewProps {
  className?: string
}

export default function TacticalCombatView({
  className
}: TacticalCombatViewProps) {
  const {
    turnQueue,
    currentTurnIndex,
    activeUnitId,
    turnNumber,
    phase,
    selectedTile,
    hoveredTile,
    playerUnits,
    enemyUnits,
    tiles
  } = useTacticalCombatStore()

  // Get active unit
  const activeUnit = [...playerUnits, ...enemyUnits].find(
    (u) => u.id === activeUnitId
  )

  // Get hovered tile info
  const hoveredTileState =
    hoveredTile && tiles[hoveredTile.y]?.[hoveredTile.x]
  const hoveredUnit = hoveredTileState?.occupantId
    ? [...playerUnits, ...enemyUnits].find(
        (u) => u.id === hoveredTileState.occupantId
      )
    : null

  return (
    <div className={`flex flex-col h-full ${className ?? ''}`}>
      {/* Top bar - Turn order */}
      <div className="flex-none p-2 bg-card border-b">
        <TurnOrderDisplay
          turnQueue={turnQueue}
          currentTurnIndex={currentTurnIndex}
          turnNumber={turnNumber}
        />
      </div>

      {/* Main content - Canvas + sidebars */}
      <div className="flex-1 flex min-h-0">
        {/* Left sidebar - Action menu */}
        <div className="flex-none w-48 p-2 bg-card border-r overflow-y-auto">
          {activeUnit?.isPlayer && phase !== 'enemy_turn' && (
            <ActionMenu
              activeUnit={activeUnit}
              phase={phase}
            />
          )}
          {phase === 'enemy_turn' && (
            <div className="text-muted-foreground text-sm text-center py-4">
              Enemy turn...
            </div>
          )}
        </div>

        {/* Center - Phaser canvas */}
        <div className="flex-1 relative bg-background">
          <TacticalCanvas className="absolute inset-0" />
        </div>

        {/* Right sidebar - Tile/unit info */}
        <div className="flex-none w-56 p-2 bg-card border-l overflow-y-auto">
          <TileInfoPanel
            hoveredTile={hoveredTile}
            hoveredTileState={hoveredTileState ?? null}
            hoveredUnit={hoveredUnit ?? null}
            selectedTile={selectedTile}
          />
        </div>
      </div>

      {/* Bottom bar - Controls hint */}
      <div className="flex-none p-2 bg-card border-t text-xs text-muted-foreground">
        <span className="mr-4">Left click: Select</span>
        <span className="mr-4">Right drag: Pan camera</span>
        <span>Scroll: Zoom</span>
      </div>
    </div>
  )
}
