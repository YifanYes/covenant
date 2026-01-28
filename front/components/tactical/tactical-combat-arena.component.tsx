'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { Zap } from '@nsmr/pixelart-react'

import { useTacticalCombatStore } from '@/stores/tactical-combat.store'
import { useCombatTurn } from '@/hooks/use-combat-turn.hook'
import { cn } from '@/lib/cn.lib'
import { queryClient, trpc } from '@/utils/trpc.utils'

import DoctrinePanel from '@/components/doctrine-panel.component'
import AlertDialog, {
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog.component'
import Button from '@/components/ui/button.component'
import ScrollArea from '@/ui/scroll-area.component'

import TurnOrderDisplay from './turn-order-display.component'
import ActionMenu from './action-menu.component'
import TileInfoPanel from './tile-info-panel.component'

import HealthBar from '@/app/(workspace)/map/_components/health-bar.component'
import EnemyCard from '@/app/(workspace)/map/_components/enemy-card.component'
import DiceRoller from '@/app/(workspace)/map/_components/dice-roller.component'
import DiceResult from '@/app/(workspace)/map/_components/dice-result.component'
import CombatLog from '@/app/(workspace)/map/_components/combat-log.component'

import { getConsumableById } from '@shared/constants/items'
import { getEnemy } from '@shared/constants/enemies'
import {
  ItemType,
  type CombatLogEntry,
  type EnemyState,
  type InventoryCharacter
} from '@shared/types/gamification.types'
import type { TacticalUnit, GridPosition, TerrainType, TileState } from '@shared/types/tactical-combat.types'

// Dynamic import for Phaser canvas (SSR-safe)
const TacticalCanvas = dynamic(() => import('./tactical-canvas.component'), { ssr: false })

interface TacticalCombatArenaProps {
  character: InventoryCharacter
  enemies: EnemyState[]
  combatLog: CombatLogEntry[]
  diceBank: number
  onAttack: (rolls: { attackRolls: number[]; defenseRolls: number[] }) => void
  isAttacking: boolean
  lastTurnResult: any
  className?: string
  participationId?: string
  activeDoctrines?: Record<string, any>
}

export default function TacticalCombatArena({
  character,
  enemies,
  combatLog,
  diceBank,
  onAttack,
  isAttacking,
  lastTurnResult,
  className,
  participationId,
  activeDoctrines
}: TacticalCombatArenaProps) {
  const { t } = useTranslation()
  const router = useRouter()

  // Tactical store state
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
    tiles,
    isInitialized,
    initializeCombat,
    reset
  } = useTacticalCombatStore()

  // Get active unit and hovered info for panels
  const activeUnit = [...playerUnits, ...enemyUnits].find((u) => u.id === activeUnitId)
  const hoveredTileState = hoveredTile && tiles[hoveredTile.y]?.[hoveredTile.x]
  const hoveredUnit = hoveredTileState?.occupantId
    ? [...playerUnits, ...enemyUnits].find((u) => u.id === hoveredTileState.occupantId)
    : null

  // Character data
  const currentClass = character.classes.find((c) => c.className === character.currentClass)
  const isDead = (currentClass?.health ?? 0) <= 0

  // Item stats for dice rolling
  const armor = character?.loadout?.find((item) => item.type === ItemType.ARMOR)
  const armorDice = armor?.stats?.physicalDefDice || armor?.stats?.magicDefDice || 1

  const weapon = character?.loadout?.find(
    (item) =>
      item.type === ItemType.WEAPON_MELEE || item.type === ItemType.WEAPON_RANGED || item.type === ItemType.WEAPON_MAGIC
  )
  const weaponDice = weapon?.stats?.attackDice || 1

  const targetEnemy = enemies.find((e) => e.currentHealth > 0)

  // Combat turn hook for dice rolling
  const {
    pendingAttackRolls,
    pendingDefenseRolls,
    submittedAttackRolls,
    submittedDefenseRolls,
    currentAvailableDice,
    diceLimit,
    isAttackPhase,
    isWaitingForResolve,
    showResults,
    handleRoll
  } = useCombatTurn({
    isAttacking,
    diceBank,
    weaponDice,
    armorDice,
    onAttack,
    lastTurnResult
  })

  // Consumable mutation
  const useConsumableMutation = useMutation({
    ...trpc.character.useConsumable.mutationOptions(),
    onSuccess: (data) => {
      if (data.healthRestored) {
        toast.success(t('consumables.health_restored', { amount: data.healthRestored }))
      }
      if (data.manaRestored) {
        toast.success(t('consumables.mana_restored', { amount: data.manaRestored }))
      }
      queryClient.invalidateQueries({ queryKey: trpc.character.getCurrentClass.queryKey() })
      queryClient.invalidateQueries({ queryKey: trpc.activity.list.queryKey() })
    },
    onError: () => {
      toast.error(t('consumables.error'))
    }
  })

  // Doctrine mutation
  const useDoctrineMutation = useMutation({
    ...trpc.character.useDoctrine.mutationOptions(),
    onSuccess: () => {
      toast.success(t('doctrines.success.used'))
      queryClient.invalidateQueries({ queryKey: trpc.character.getCurrentClass.queryKey() })
      queryClient.invalidateQueries({ queryKey: trpc.activity.list.queryKey() })
    },
    onError: (error) => {
      toast.error(t('doctrines.error.failed'), { description: error.message })
    }
  })

  // Group consumables
  const inventoryConsumables = character.inventory.filter((item) => item.type === ItemType.CONSUMABLE)
  const groupedConsumables = inventoryConsumables.reduce(
    (acc, item) => {
      const key = item.definitionId || item.id
      if (!acc[key]) {
        acc[key] = { item, count: 0 }
      }
      acc[key].count++
      return acc
    },
    {} as Record<string, { item: (typeof inventoryConsumables)[0]; count: number }>
  )

  // Initialize tactical combat state from character and enemies
  useEffect(() => {
    if (!character || enemies.length === 0) return

    // Create player unit from character
    const playerUnit: TacticalUnit = {
      id: 'player-1',
      templateId: character.currentClass ?? 'player',
      name: character.name,
      position: { x: 1, y: 3 },
      isPlayer: true,
      spriteUrl: `/assets/classes/${character.currentClass}.png`,
      currentHealth: currentClass?.health ?? 100,
      maxHealth: currentClass?.maxHealth ?? 100,
      currentMana: currentClass?.mana ?? 50,
      maxMana: currentClass?.maxMana ?? 50,
      movementRange: 3,
      attackRange: weapon?.stats?.range ?? 1,
      speed: weapon?.stats?.speed ?? 2,
      hasMoved: false,
      hasActed: false,
      activeEffects: []
    }

    // Create enemy units from enemies
    const tacticalEnemies: TacticalUnit[] = enemies.map((enemy, index) => {
      const template = getEnemy(enemy.templateId)
      return {
        id: enemy.id,
        templateId: enemy.templateId,
        name: enemy.namePrefix && enemy.nameSuffix
          ? `${t(enemy.namePrefix)} ${t(enemy.nameSuffix)}`
          : t(template?.name ?? 'Enemy'),
        position: { x: 6, y: 2 + index },
        isPlayer: false,
        spriteUrl: template?.imageId ? `/assets/enemies/${template.imageId}.png` : undefined,
        currentHealth: enemy.currentHealth,
        maxHealth: enemy.maxHealth,
        currentMana: 0,
        maxMana: 0,
        movementRange: 2,
        attackRange: template?.attackDice ?? 1,
        speed: 1,
        hasMoved: false,
        hasActed: false,
        activeEffects: []
      }
    })

    // Create grid
    const gridWidth = 8
    const gridHeight = 6
    const newTiles: TileState[][] = []

    for (let y = 0; y < gridHeight; y++) {
      newTiles[y] = []
      for (let x = 0; x < gridWidth; x++) {
        let terrain: TerrainType = 'GRASS'
        if (x === 0 || x === gridWidth - 1 || y === 0 || y === gridHeight - 1) {
          terrain = 'STONE'
        }
        newTiles[y][x] = {
          position: { x, y },
          terrain,
          occupantId: null,
          isWalkable: true
        }
      }
    }

    // Set occupants
    newTiles[playerUnit.position.y][playerUnit.position.x].occupantId = playerUnit.id
    for (const enemy of tacticalEnemies) {
      if (newTiles[enemy.position.y]?.[enemy.position.x]) {
        newTiles[enemy.position.y][enemy.position.x].occupantId = enemy.id
      }
    }

    // Create turn queue sorted by speed (higher speed goes first)
    const allUnits = [playerUnit, ...tacticalEnemies]
    const turnQueue = [...allUnits].sort((a, b) => {
      const speedDiff = b.speed - a.speed
      if (speedDiff !== 0) return speedDiff
      return a.isPlayer ? -1 : 1
    })

    initializeCombat({
      mapTemplateId: 'arena_small',
      gridWidth,
      gridHeight,
      tiles: newTiles,
      playerUnits: [playerUnit],
      enemyUnits: tacticalEnemies,
      turnQueue
    })
  }, [character?.id, enemies.length])

  // Helper to render dice groups
  const renderDice = (
    pending: number[] | undefined,
    submitted: number[] | undefined,
    resolved: { value: number; isSuccess: boolean; isCritical: boolean }[] | undefined,
    prefix: string
  ) => {
    if (pending) {
      return pending.map((v, i) => (
        <DiceResult key={`${prefix}-p-${i}`} value={v} isSuccess={false} isCritical={false} isRolling />
      ))
    }
    if (isAttacking && submitted) {
      return submitted.map((v, i) => (
        <DiceResult
          key={`${prefix}-s-${i}`}
          value={v}
          isSuccess={false}
          isCritical={false}
          className='animate-pulse opacity-70'
        />
      ))
    }
    return resolved?.map((r, i) => (
      <DiceResult key={`${prefix}-${i}`} value={r.value} isSuccess={r.isSuccess} isCritical={r.isCritical} />
    ))
  }

  if (!currentClass) return null
  const rollButtonLabel = isAttackPhase ? t('combat.roll_attack') : t('combat.roll_defense')

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Top bar - Turn order */}
      <div className='bg-card flex-none border-b p-2'>
        <TurnOrderDisplay turnQueue={turnQueue} currentTurnIndex={currentTurnIndex} turnNumber={turnNumber} />
      </div>

      {/* Main content */}
      <div className='flex min-h-0 flex-1'>
        {/* Left sidebar - Character + Actions + Consumables + Doctrines */}
        <div className='bg-card flex w-72 flex-none flex-col gap-3 overflow-y-auto border-r p-3'>
          {/* Character Status */}
          <div className='rounded-lg border p-3'>
            <div className='flex gap-3'>
              <div className='bg-muted/50 relative flex aspect-square w-16 shrink-0 items-center justify-center rounded-md border p-1'>
                <Image
                  src={`/assets/classes/${character.currentClass!}.png`}
                  alt={character.currentClass!}
                  width={64}
                  height={64}
                  className='h-full w-full object-contain'
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
              <div className='flex flex-1 flex-col justify-center'>
                <h3 className='mb-1 text-sm font-semibold'>{character.name}</h3>
                <div className='space-y-1'>
                  <div className='max-w-40'>
                    <div className='text-muted-foreground mb-0.5 flex justify-between text-[10px]'>
                      <span>{t('inventory.health')}</span>
                      <span>
                        {currentClass.health}/{currentClass.maxHealth}
                      </span>
                    </div>
                    <HealthBar current={currentClass.health} max={currentClass.maxHealth} showLabel={false} />
                  </div>
                  <div className='max-w-40'>
                    <div className='text-muted-foreground mb-0.5 flex justify-between text-[10px]'>
                      <span>{t('inventory.mana')}</span>
                      <span>
                        {currentClass.mana}/{currentClass.maxMana}
                      </span>
                    </div>
                    <div className='bg-muted relative h-1.5 overflow-hidden rounded-full'>
                      <div
                        className='absolute inset-y-0 left-0 bg-blue-500 transition-all duration-300'
                        style={{ width: `${(currentClass.mana / currentClass.maxMana) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Status Effects */}
            {activeDoctrines && Object.values(activeDoctrines).length > 0 && (
              <div className='mt-2 flex flex-wrap gap-1 border-t pt-2'>
                {Object.values(activeDoctrines).map((effect: any, i) => (
                  <div
                    key={i}
                    className='flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-500'
                  >
                    <Zap className='h-3 w-3' />
                    <span>{effect.effect}</span>
                    <span className='opacity-70'>({effect.remainingTurns}t)</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Menu (when it's player's turn) */}
          {activeUnit?.isPlayer && phase !== 'enemy_turn' && (
            <div className='rounded-lg border p-3'>
              <ActionMenu activeUnit={activeUnit} phase={phase} />
            </div>
          )}
          {phase === 'enemy_turn' && (
            <div className='text-muted-foreground rounded-lg border p-3 text-center text-sm'>
              {t('combat.enemy_turn', 'Enemy turn...')}
            </div>
          )}

          {/* Consumables Section */}
          {Object.keys(groupedConsumables).length > 0 && (
            <div className='rounded-lg border p-3'>
              <div className='mb-2 text-xs font-medium tracking-wider text-green-500/80 uppercase'>
                {t('consumables.title')}
              </div>
              <div className='flex flex-wrap gap-1.5'>
                {Object.entries(groupedConsumables).map(([defId, { item, count }]) => {
                  const definition = getConsumableById(defId)
                  return (
                    <Button
                      key={defId}
                      variant='outline'
                      size='sm'
                      disabled={useConsumableMutation.isPending}
                      onClick={() => useConsumableMutation.mutate({ consumableId: defId })}
                      className='flex items-center gap-1.5 text-xs'
                    >
                      <span>{t(definition?.nameKey || item.nameKey)}</span>
                      <span className='text-muted-foreground'>x{count}</span>
                    </Button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Center - Phaser canvas + Doctrines */}
        <div className='flex flex-1 flex-col'>
          <div className='bg-background relative min-h-0 flex-1'>
            <TacticalCanvas className='absolute inset-0' />
          </div>

          {/* Doctrines Section - below game scene */}
          <DoctrinePanel
            showUseControls
            horizontal
            currentMana={currentClass?.mana ?? 0}
            onUseDoctrine={(doctrine) => {
              if (!participationId) {
                toast.error(t('combat.error.no_participation'))
                return
              }
              useDoctrineMutation.mutate({ doctrineId: doctrine.id, participationId })
            }}
            isUsingDoctrine={useDoctrineMutation.isPending}
            className='bg-card flex-none border-t'
          />
        </div>

        {/* Right sidebar - Enemies + Dice + Combat Log */}
        <div className='bg-card flex w-80 flex-none flex-col gap-3 overflow-y-auto border-l p-3'>
          {/* Enemies */}
          <div className='rounded-lg border p-3'>
            <h3 className='mb-2 text-sm font-semibold'>{t('combat.enemies')}</h3>
            <ScrollArea className='max-h-40'>
              <div className='flex flex-col gap-2 pr-2'>
                {enemies.map((enemy) => (
                  <EnemyCard key={enemy.id} enemy={enemy} isTarget={targetEnemy?.id === enemy.id} />
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Dice Roller (when attacking) */}
          {phase === 'select_target' && (
            <>
              <DiceRoller
                diceBank={currentAvailableDice}
                onRoll={handleRoll}
                isRolling={isWaitingForResolve}
                customButtonLabel={rollButtonLabel}
                title={isAttacking ? t('combat.to_battle') : undefined}
                diceLimit={diceLimit}
              />

              {/* Attack/Defense Dice Results */}
              <div className='space-y-2'>
                {(pendingAttackRolls ||
                  submittedAttackRolls ||
                  (showResults && !!lastTurnResult?.playerAttackRolls?.length)) && (
                  <div className='rounded-lg border p-2 transition-all duration-300'>
                    <div className='mb-1 text-xs font-medium tracking-wider text-orange-500/80 uppercase'>
                      {t('combat.attack_rolls')}
                    </div>
                    <div className='flex flex-wrap justify-center gap-1'>
                      {renderDice(pendingAttackRolls, submittedAttackRolls, lastTurnResult?.playerAttackRolls, 'atk')}
                    </div>
                  </div>
                )}

                {(pendingDefenseRolls ||
                  submittedDefenseRolls ||
                  (showResults && !!lastTurnResult?.playerDefenseRolls?.length)) && (
                  <div className='rounded-lg border p-2 transition-all duration-300'>
                    <div className='mb-1 text-xs font-medium tracking-wider text-blue-500/80 uppercase'>
                      {t('combat.defense_rolls')}
                    </div>
                    <div className='flex flex-wrap justify-center gap-1'>
                      {renderDice(pendingDefenseRolls, submittedDefenseRolls, lastTurnResult?.playerDefenseRolls, 'def')}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Tile Info Panel (when not attacking) */}
          {phase !== 'select_target' && (
            <div className='rounded-lg border p-3'>
              <TileInfoPanel
                hoveredTile={hoveredTile}
                hoveredTileState={hoveredTileState ?? null}
                hoveredUnit={hoveredUnit ?? null}
                selectedTile={selectedTile}
              />
            </div>
          )}

          {/* Combat Log */}
          <CombatLog entries={combatLog} className='max-h-60 flex-1 overflow-y-auto' />
        </div>
      </div>

      {/* Bottom bar - Controls hint */}
      <div className='bg-card text-muted-foreground flex-none border-t p-2 text-xs'>
        <span className='mr-4'>{t('tactical.controls.select', 'Left click: Select')}</span>
        <span className='mr-4'>{t('tactical.controls.pan', 'Right drag: Pan camera')}</span>
        <span>{t('tactical.controls.zoom', 'Scroll: Zoom')}</span>
      </div>

      {/* Death Dialog */}
      <AlertDialog open={isDead}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('combat.death_dialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('combat.death_dialog.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => router.push('/inventory')}>
              {t('combat.death_dialog.continue')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
