'use client'

import CombatLog from '@/app/(workspace)/map/_components/combat-log.component'
import DiceResult from '@/app/(workspace)/map/_components/dice-result.component'
import DiceRoller from '@/app/(workspace)/map/_components/dice-roller.component'
import EnemyCard from '@/app/(workspace)/map/_components/enemy-card.component'
import HealthBar from '@/app/(workspace)/map/_components/health-bar.component'
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
import { useCombatTurn } from '@/hooks/use-combat-turn.hook'
import { useTacticalAttack } from '@/hooks/use-tactical-attack.hook'
import { useTacticalDoctrine } from '@/hooks/use-tactical-doctrine.hook'
import { useTacticalEnemyTurn } from '@/hooks/use-tactical-enemy-turn.hook'
import { cn } from '@/lib/cn.lib'
import { useTacticalCombatStore } from '@/stores/tactical-combat.store'
import ScrollArea from '@/ui/scroll-area.component'
import { queryClient, trpc, trpcOptions } from '@/utils/trpc.utils'
import { Zap } from '@nsmr/pixelart-react'
import { DOCTRINES } from '@shared/constants/doctrines'
import { getEnemy } from '@shared/constants/enemies'
import { getConsumableById } from '@shared/constants/items'
import { DoctrineEffectType, DoctrineTarget } from '@shared/types/doctrine.types'
import {
  ItemType,
  type CombatLogEntry,
  type EnemyState,
  type InventoryCharacter
} from '@shared/types/gamification.types'
import type { TacticalUnit, TileState } from '@shared/types/tactical-combat.types'
import { generateMapTiles } from '@shared/constants/map-themes'
import { useMutation } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import ActionMenu from './action-menu.component'
import TileInfoPanel from './tile-info-panel.component'
import TurnOrderDisplay from './turn-order-display.component'

// Dynamic import for Phaser canvas (SSR-safe)
const TacticalCanvas = dynamic(() => import('./tactical-canvas.component'), { ssr: false })

interface TacticalCombatArenaProps {
  character: InventoryCharacter
  enemies: EnemyState[]
  combatLog: CombatLogEntry[]
  diceBank: number
  lastTurnResult: any
  className?: string
  participationId: string
  activeDoctrines?: Record<string, any>
  failureText?: string
  mapId?: string
}

export default function TacticalCombatArena({
  character,
  enemies,
  combatLog,
  diceBank,
  lastTurnResult,
  className,
  participationId,
  activeDoctrines,
  failureText,
  mapId = 'default'
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
    isSceneReady,
    initializeCombat,
    hydrateFromState,
    updateUnit,
    clearActiveUnitDoctrines,
    selectDoctrine
  } = useTacticalCombatStore()

  // Fetch persisted tactical state if participationId is provided
  const { data: persistedTacticalState, isLoading: isLoadingTacticalState } = trpc.activity.getTacticalState.useQuery(
    { participationId: participationId! },
    { enabled: !!participationId }
  )

  // Get active unit and hovered info for panels
  const allUnits = [...playerUnits, ...enemyUnits]
  const activeUnit = allUnits.find((u) => u.id === activeUnitId)
  const playerUnit = playerUnits[0]
  const hoveredTileState = hoveredTile && tiles[hoveredTile.y]?.[hoveredTile.x]
  const hoveredUnit = hoveredTileState?.occupantId ? allUnits.find((u) => u.id === hoveredTileState.occupantId) : null

  // Create turn queue with updated health values from playerUnits/enemyUnits
  const turnQueueWithHealth = turnQueue.map((unit) => {
    const currentUnit = allUnits.find((u) => u.id === unit.id)
    return currentUnit ?? unit
  })

  // Character data
  const currentClass = character.classes.find((c) => c.className === character.currentClass)
  // Player is dead if: their health is 0, OR they were removed from the combat (killed and filtered out)
  const isDead = playerUnit
    ? playerUnit.currentHealth <= 0
    : isSceneReady && playerUnits.length === 0

  // Item stats for dice rolling
  const armor = character?.loadout?.find((item) => item.type === ItemType.ARMOR)
  const armorDice = armor?.stats?.physicalDefDice || armor?.stats?.magicDefDice || 1

  const weapon = character?.loadout?.find(
    (item) =>
      item.type === ItemType.WEAPON_MELEE || item.type === ItemType.WEAPON_RANGED || item.type === ItemType.WEAPON_MAGIC
  )
  const baseWeaponDice = weapon?.stats?.attackDice || 1

  // Get bonus dice from active self-buff doctrines (like Stellar Collapse)

  // Calculate bonus dice from active effects (memoized to avoid infinite loops)
  const doctrineBonusDice = useMemo(() => {
    const activeUnit = playerUnits.find((u) => u.id === activeUnitId)
    if (!activeUnit) return 0

    let bonusDice = 0

    for (const effect of activeUnit.activeEffects) {
      if (effect.remainingTurns <= 0) continue
      const doctrine = DOCTRINES[effect.sourceDoctrineId]
      if (!doctrine) continue

      for (const doctrineEffect of doctrine.effects) {
        if (
          doctrineEffect.type === DoctrineEffectType.POWER_MODIFIER &&
          doctrineEffect.target === DoctrineTarget.SELF
        ) {
          bonusDice += doctrineEffect.value || 0
        }
      }
    }

    return bonusDice
  }, [activeUnitId, playerUnits])

  const weaponDice = baseWeaponDice + doctrineBonusDice

  // Tactical attack hook
  const { confirmAttack, getPendingAttackInfo, isLoading: isTacticalAttackLoading } = useTacticalAttack()

  // Get pending attack info for UI
  const pendingAttackInfo = getPendingAttackInfo()

  // Enemy AI turn hook - automatically executes when it's an enemy's turn
  const { isExecuting: isEnemyTurnExecuting } = useTacticalEnemyTurn()

  // Handler for when dice rolling completes - executes tactical combat
  const handleTacticalAttack = useCallback(
    async (rolls: { attackRolls: number[]; defenseRolls: number[] }) => {
      const attackInfo = getPendingAttackInfo()

      if (attackInfo) {
        await confirmAttack({
          attackRolls: rolls.attackRolls,
          defenseRolls: rolls.defenseRolls
        })

        // Clear consumed doctrine buffs after attack
        if (doctrineBonusDice > 0) {
          clearActiveUnitDoctrines()
        }
      }
    },
    [confirmAttack, getPendingAttackInfo, doctrineBonusDice, clearActiveUnitDoctrines]
  )

  // Combat turn hook for dice rolling
  const {
    submittedAttackRolls,
    submittedDefenseRolls,
    attackDiceCount,
    defenseDiceCount,
    isWaitingForResolve,
    showResults,
    handleRoll,
    clearResults
  } = useCombatTurn({
    isAttacking: isTacticalAttackLoading,
    diceBank,
    weaponDice,
    armorDice,
    onAttack: handleTacticalAttack,
    lastTurnResult
  })

  // Clear dice results when user starts a different action (Move) or it becomes enemy turn
  useEffect(() => {
    if (phase === 'select_move' || phase === 'enemy_turn') {
      clearResults()
    }
  }, [phase, clearResults])

  // Consumable mutation
  const useConsumableMutation = useMutation({
    ...trpcOptions.character.useConsumable.mutationOptions(),
    onSuccess: (data) => {
      if (data.healthRestored) {
        toast.success(t('consumables.health_restored', { amount: data.healthRestored }))
      }
      if (data.manaRestored) {
        toast.success(t('consumables.mana_restored', { amount: data.manaRestored }))
      }
      // Get fresh player unit from store to avoid stale closure
      const currentPlayerUnit = useTacticalCombatStore.getState().playerUnits[0]
      if (currentPlayerUnit && (data.healthRestored || data.manaRestored)) {
        updateUnit(currentPlayerUnit.id, {
          currentHealth: Math.min(
            currentPlayerUnit.currentHealth + (data.healthRestored ?? 0),
            currentPlayerUnit.maxHealth
          ),
          currentMana: Math.min(
            currentPlayerUnit.currentMana + (data.manaRestored ?? 0),
            currentPlayerUnit.maxMana
          )
        })
      }
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() })
      queryClient.invalidateQueries({ queryKey: trpcOptions.activity.list.queryKey() })
    },
    onError: () => {
      toast.error(t('consumables.error'))
    }
  })

  // Tactical doctrine hook
  const { confirmSelfBuff, isSelfBuffDoctrine, isLoading: isDoctrineLoading } = useTacticalDoctrine()

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
    // Wait for tactical state query to complete if we have a participationId
    if (participationId && isLoadingTacticalState) return

    // Create player unit template from character
    const playerUnit: TacticalUnit = {
      id: 'player-1',
      templateId: character.currentClass ?? 'player',
      name: character.name,
      position: { x: 1, y: 3 }, // Default position, will be overridden if hydrating
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

    // Create enemy unit templates from enemies
    const tacticalEnemies: TacticalUnit[] = enemies.map((enemy, index) => {
      const template = getEnemy(enemy.templateId)
      return {
        id: enemy.id,
        templateId: enemy.templateId,
        name:
          enemy.namePrefix && enemy.nameSuffix
            ? `${t(enemy.namePrefix)} ${t(enemy.nameSuffix)}`
            : t(template?.name ?? 'Enemy'),
        position: { x: 6, y: 2 + index }, // Default position, will be overridden if hydrating
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

    const allUnitTemplates = [playerUnit, ...tacticalEnemies]

    // If we have persisted state with valid structure, hydrate from it
    if (persistedTacticalState?.units && participationId) {
      hydrateFromState(persistedTacticalState, allUnitTemplates, participationId)
      return
    }

    // Otherwise, create fresh combat state
    // Create grid using map theme
    const gridWidth = 8
    const gridHeight = 6
    const newTiles: TileState[][] = generateMapTiles(mapId, gridWidth, gridHeight)

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

    initializeCombat(
      {
        mapTemplateId: mapId,
        gridWidth,
        gridHeight,
        tiles: newTiles,
        playerUnits: [playerUnit],
        enemyUnits: tacticalEnemies,
        turnQueue
      },
      participationId
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Initialization effect: only re-run when IDs change, not when derived values (health, mana) change during combat
  }, [character?.id, enemies.length, participationId, isLoadingTacticalState, persistedTacticalState, mapId])

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
    // Show resolved results if available
    if (resolved?.length) {
      return resolved.map((r, i) => (
        <DiceResult key={`${prefix}-${i}`} value={r.value} isSuccess={r.isSuccess} isCritical={r.isCritical} />
      ))
    }
    // Show submitted dice while waiting for results or as fallback
    // Calculate success/critical based on standard thresholds (4+ success, 6 critical)
    if (submitted) {
      return submitted.map((v, i) => (
        <DiceResult
          key={`${prefix}-s-${i}`}
          value={v}
          isSuccess={v >= 4}
          isCritical={v === 6}
          className={isTacticalAttackLoading ? "animate-pulse opacity-70" : ""}
        />
      ))
    }
    return null
  }

  if (!currentClass) return null

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      {/* Top bar - Turn order */}
      <div className="bg-card flex-none border-b p-2">
        <TurnOrderDisplay turnQueue={turnQueueWithHealth} currentTurnIndex={currentTurnIndex} turnNumber={turnNumber} />
      </div>

      {/* Main content */}
      <div className="flex min-h-0 flex-1">
        {/* Left sidebar - Character + Actions + Consumables + Doctrines */}
        <div className="bg-card flex w-72 flex-none flex-col gap-3 overflow-y-auto border-r p-3">
          {/* Character Status */}
          <div className="rounded-lg border p-3">
            <div className="flex gap-3">
              <div className="bg-muted/50 relative flex aspect-square w-16 shrink-0 items-center justify-center rounded-md border p-1">
                <Image
                  src={`/assets/classes/${character.currentClass!}.png`}
                  alt={character.currentClass!}
                  width={64}
                  height={64}
                  className="h-full w-full object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
              <div className="flex flex-1 flex-col justify-center">
                <h3 className="mb-1 text-sm font-semibold">{character.name}</h3>
                <div className="space-y-1">
                  <div className="max-w-40">
                    <div className="text-muted-foreground mb-0.5 flex justify-between text-[10px]">
                      <span>{t('inventory.health')}</span>
                      <span>
                        {playerUnit?.currentHealth ?? currentClass.health}/
                        {playerUnit?.maxHealth ?? currentClass.maxHealth}
                      </span>
                    </div>
                    <HealthBar
                      current={playerUnit?.currentHealth ?? currentClass.health}
                      max={playerUnit?.maxHealth ?? currentClass.maxHealth}
                      showLabel={false}
                    />
                  </div>
                  <div className="max-w-40">
                    <div className="text-muted-foreground mb-0.5 flex justify-between text-[10px]">
                      <span>{t('inventory.mana')}</span>
                      <span>
                        {playerUnit?.currentMana ?? currentClass.mana}/{playerUnit?.maxMana ?? currentClass.maxMana}
                      </span>
                    </div>
                    <div className="bg-muted relative h-1.5 overflow-hidden rounded-full">
                      <div
                        className="absolute inset-y-0 left-0 bg-blue-500 transition-all duration-300"
                        style={{
                          width: `${((playerUnit?.currentMana ?? currentClass.mana) / (playerUnit?.maxMana ?? currentClass.maxMana)) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Status Effects */}
            {activeDoctrines && Object.values(activeDoctrines).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1 border-t pt-2">
                {Object.values(activeDoctrines).map((effect: any, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-500"
                  >
                    <Zap className="h-3 w-3" />
                    <span>{effect.effect}</span>
                    <span className="opacity-70">({effect.remainingTurns}t)</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Menu (when it's player's turn) - fixed height container */}
          <div className="min-h-45 rounded-lg border p-3">
            {activeUnit?.isPlayer && phase !== 'enemy_turn' && (
              <ActionMenu activeUnit={activeUnit} phase={phase} />
            )}
            {(phase === 'enemy_turn' || isEnemyTurnExecuting) && (
              <div className="text-muted-foreground text-center text-sm">
                <span className="animate-pulse">{t('combat.enemy_turn')}</span>
              </div>
            )}
          </div>

          {/* Consumables Section */}
          {Object.keys(groupedConsumables).length > 0 && (
            <div className="rounded-lg border p-3">
              <div className="mb-2 text-xs font-medium tracking-wider text-green-500/80 uppercase">
                {t('consumables.title')}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(groupedConsumables).map(([defId, { item, count }]) => {
                  const definition = getConsumableById(defId)
                  return (
                    <Button
                      key={defId}
                      variant="outline"
                      size="sm"
                      disabled={useConsumableMutation.isPending}
                      onClick={() => useConsumableMutation.mutate({ consumableId: defId })}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <span>{t(definition?.nameKey || item.nameKey)}</span>
                      <span className="text-muted-foreground">x{count}</span>
                    </Button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Center - Phaser canvas + Doctrines */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="bg-background relative min-h-75 flex-1">
            <TacticalCanvas className="absolute inset-0" />
            {!isSceneReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <span className="text-sm text-white">{t('common.loading')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Doctrines Section - below game scene */}
          <div className="bg-card h-32 flex-none border-t">
            <DoctrinePanel
              showUseControls
              horizontal
              currentMana={currentClass?.mana ?? 0}
              onUseDoctrine={(doctrine) => {
                if (!participationId) {
                  toast.error(t('combat.error.no_participation'))
                  return
                }
                // Use the tactical self-buff doctrine endpoint
                if (isSelfBuffDoctrine(doctrine.id)) {
                  confirmSelfBuff(doctrine.id)
                } else {
                  // For targeted doctrines, enter targeting mode
                  selectDoctrine(doctrine.id)
                }
              }}
              isUsingDoctrine={isDoctrineLoading}
              className="h-full overflow-y-auto"
            />
          </div>
        </div>

        {/* Right sidebar - Enemies + Dice + Combat Log */}
        <div className="bg-card flex w-80 flex-none flex-col gap-3 overflow-y-auto border-l p-3">
          {/* Enemies */}
          <div className="rounded-lg border p-3">
            <h3 className="mb-2 text-sm font-semibold">{t('combat.enemies')}</h3>
            <ScrollArea className="max-h-40">
              <div className="flex flex-col gap-2 pr-2">
                {enemyUnits.map((storeEnemy) => {
                  // Build enemy state from store's tactical unit
                  // Name format from server is "prefix|suffix"
                  const [namePrefix, nameSuffix] = storeEnemy.name.includes('|')
                    ? storeEnemy.name.split('|')
                    : [undefined, storeEnemy.name]
                  const displayEnemy: EnemyState = {
                    id: storeEnemy.id,
                    templateId: storeEnemy.templateId,
                    currentHealth: storeEnemy.currentHealth,
                    maxHealth: storeEnemy.maxHealth,
                    namePrefix,
                    nameSuffix
                  }
                  return <EnemyCard key={storeEnemy.id} enemy={displayEnemy} isTarget={storeEnemy.currentHealth > 0} />
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Dice Roller (when attacking with target selected, or showing results) */}
          {(pendingAttackInfo?.target || showResults || submittedAttackRolls || submittedDefenseRolls) && (
            <>
              {phase === 'select_target' && pendingAttackInfo?.target && (
                <DiceRoller
                  diceBank={diceBank}
                  attackDiceCount={attackDiceCount}
                  defenseDiceCount={defenseDiceCount}
                  onRoll={handleRoll}
                  isRolling={isWaitingForResolve}
                />
              )}

              {/* Attack/Defense Dice Results */}
              <div className="space-y-2">
                {(submittedAttackRolls ||
                  (showResults && !!lastTurnResult?.playerAttackRolls?.length)) && (
                  <div className="rounded-lg border p-2 transition-all duration-300">
                    <div className="mb-1 text-xs font-medium tracking-wider text-orange-500/80 uppercase">
                      {t('combat.attack_rolls')}
                    </div>
                    <div className="flex flex-wrap justify-center gap-1">
                      {renderDice(undefined, submittedAttackRolls, lastTurnResult?.playerAttackRolls, 'atk')}
                    </div>
                  </div>
                )}

                {(submittedDefenseRolls ||
                  (showResults && !!lastTurnResult?.playerDefenseRolls?.length)) && (
                  <div className="rounded-lg border p-2 transition-all duration-300">
                    <div className="mb-1 text-xs font-medium tracking-wider text-blue-500/80 uppercase">
                      {t('combat.defense_rolls')}
                    </div>
                    <div className="flex flex-wrap justify-center gap-1">
                      {renderDice(
                        undefined,
                        submittedDefenseRolls,
                        lastTurnResult?.playerDefenseRolls,
                        'def'
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Tile Info Panel (when not attacking and no dice results to show) */}
          {phase !== 'select_target' && !showResults && !submittedAttackRolls && !submittedDefenseRolls && (
            <div className="rounded-lg border p-3">
              <TileInfoPanel
                hoveredTile={hoveredTile}
                hoveredTileState={hoveredTileState ?? null}
                hoveredUnit={hoveredUnit ?? null}
                selectedTile={selectedTile}
              />
            </div>
          )}

          {/* Combat Log */}
          <CombatLog entries={combatLog} className="max-h-60 flex-1 overflow-y-auto" />
        </div>
      </div>

      {/* Bottom bar - Controls hint */}
      <div className="bg-card text-muted-foreground flex-none border-t p-2 text-xs">
        <span className="mr-4">{t('tactical.controls.select')}</span>
        <span className="mr-4">{t('tactical.controls.pan')}</span>
        <span>{t('tactical.controls.zoom')}</span>
      </div>

      {/* Death Dialog */}
      <AlertDialog open={isDead}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('combat.death_dialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {failureText ? t(failureText) : t('combat.death_dialog.description')}
            </AlertDialogDescription>
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
