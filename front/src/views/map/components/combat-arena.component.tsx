import AlertDialog, {
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog.component'
import { cn } from '@/lib/cn.lib'
import ScrollArea from '@/ui/scroll-area.component'
import {
  ItemType,
  type CombatLogEntry,
  type EnemyState,
  type InventoryCharacter
} from '@shared/types/gamification.types'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import CombatLog from './combat-log.component'
import DiceResult from './dice-result.component'
import DiceRoller from './dice-roller.component'
import EnemyCard from './enemy-card.component'
import HealthBar from './health-bar.component'

interface CombatArenaProps {
  character: InventoryCharacter
  enemies: EnemyState[]
  combatLog: CombatLogEntry[]
  diceBank: number
  onAttack: (rolls: { attackRolls: number[]; defenseRolls: number[] }) => void
  isAttacking: boolean
  lastTurnResult: any
  className?: string
}

const RESOLVE_DELAY_MS = 1500

export default function CombatArena({
  character,
  enemies,
  combatLog,
  diceBank,
  onAttack,
  isAttacking,
  lastTurnResult,
  className
}: CombatArenaProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const currentClass = character.classes.find((c) => c.className === character.currentClass)
  const isDead = (currentClass?.health ?? 0) <= 0

  // Local state for rolling animation
  const [pendingAttackRolls, setPendingAttackRolls] = useState<number[] | undefined>()
  const [pendingDefenseRolls, setPendingDefenseRolls] = useState<number[] | undefined>()
  const isResolvingRef = useRef(false)
  const [submittedAttackRolls, setSubmittedAttackRolls] = useState<number[] | undefined>()
  const [submittedDefenseRolls, setSubmittedDefenseRolls] = useState<number[] | undefined>()

  // Clear submitted rolls when we get a result
  useEffect(() => {
    if (lastTurnResult) {
      const timer = setTimeout(() => {
        setSubmittedAttackRolls(undefined)
        setSubmittedDefenseRolls(undefined)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [lastTurnResult])

  // Calculate dice bank available for UI
  const currentAvailableDice = (() => {
    let usedDice = 0
    if (pendingAttackRolls) usedDice += pendingAttackRolls.length
    if (pendingDefenseRolls) usedDice += pendingDefenseRolls.length
    return Math.max(0, diceBank - usedDice)
  })()

  // Auto-resolve after defense rolls are set with a delay
  useEffect(() => {
    if (pendingAttackRolls && pendingDefenseRolls && !isResolvingRef.current && !isAttacking) {
      isResolvingRef.current = true
      const timer = setTimeout(() => {
        // Transfer pending to submitted (keep them visible while waiting for backend)
        setSubmittedAttackRolls(pendingAttackRolls)
        setSubmittedDefenseRolls(pendingDefenseRolls)
        onAttack({ attackRolls: pendingAttackRolls, defenseRolls: pendingDefenseRolls })
        setPendingAttackRolls(undefined)
        setPendingDefenseRolls(undefined)
        isResolvingRef.current = false
      }, RESOLVE_DELAY_MS)
      return () => {
        clearTimeout(timer)
        isResolvingRef.current = false
      }
    }
  }, [pendingAttackRolls, pendingDefenseRolls, isAttacking, onAttack])

  const showResults = !!(lastTurnResult && !isAttacking && !pendingAttackRolls && !pendingDefenseRolls)

  if (!currentClass) return null

  const rollButtonLabel = pendingAttackRolls ? t('combat.roll_defense') : t('combat.roll_attack')
  const isWaitingForResolve = !!(pendingAttackRolls && pendingDefenseRolls) || isAttacking

  // Find equipped items
  const armor = character?.loadout?.find((item) => item.type === ItemType.ARMOR)
  const armorDice = armor?.stats?.physicalDefDice || armor?.stats?.magicDefDice || 1

  const weapon = character?.loadout?.find(
    (item) =>
      item.type === ItemType.WEAPON_MELEE || item.type === ItemType.WEAPON_RANGED || item.type === ItemType.WEAPON_MAGIC
  )
  const weaponDice = weapon?.stats?.attackDice || 1

  const diceLimit = Math.min(diceBank, !pendingAttackRolls ? weaponDice : armorDice)

  const targetEnemy = enemies.find((e) => e.currentHealth > 0)

  const handleRoll = (count: number) => {
    if (!pendingAttackRolls) {
      // Clear previous turn's submitted rolls when starting a new turn
      setSubmittedAttackRolls(undefined)
      setSubmittedDefenseRolls(undefined)
      setPendingAttackRolls(Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1))
    } else {
      const defenseRolls = Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1)
      setPendingDefenseRolls(defenseRolls)
    }
  }

  const renderDice = (
    pending?: number[],
    submitted?: number[],
    resolved?: { value: number; isSuccess: boolean; isCritical: boolean }[],
    prefix: string = 'dice'
  ) => {
    if (pending) {
      return pending.map((v, i) => (
        <DiceResult key={`${prefix}-p-${i}`} value={v} isSuccess={false} isCritical={false} isRolling />
      ))
    }
    if (isAttacking && submitted) {
      return submitted.map((v, i) => (
        <DiceResult key={`${prefix}-s-${i}`} value={v} isSuccess={false} isCritical={false} isRolling />
      ))
    }
    return resolved?.map((r, i) => (
      <DiceResult key={`${prefix}-${i}`} value={r.value} isSuccess={r.isSuccess} isCritical={r.isCritical} />
    ))
  }

  return (
    <div className={cn('grid gap-4 lg:grid-cols-[1fr_3fr]', className)}>
      {/* Left: Character Status + Dice Roller */}
      <div className='flex flex-col gap-4'>
        <div className='rounded-lg border p-4'>
          <div className='flex h-full gap-4'>
            <div className='bg-muted/50 relative flex h-full w-24 shrink-0 items-center justify-center rounded-md border p-2'>
              <img
                src={`/assets/classes/${character.currentClass!}.png`}
                alt={character.currentClass!}
                className='h-full w-full object-contain'
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            <div className='flex flex-1 flex-col justify-center'>
              <h3 className='mb-3 font-semibold'>{character.name}</h3>

              <div className='space-y-3'>
                <div>
                  <div className='text-muted-foreground mb-1 flex justify-between text-xs'>
                    <span>{t('inventory.health')}</span>
                    <span>
                      {currentClass.health}/{currentClass.maxHealth}
                    </span>
                  </div>
                  <HealthBar current={currentClass.health} max={currentClass.maxHealth} showLabel={false} />
                </div>

                <div>
                  <div className='text-muted-foreground mb-1 flex justify-between text-xs'>
                    <span>{t('inventory.mana')}</span>
                    <span>
                      {currentClass.mana}/{currentClass.maxMana}
                    </span>
                  </div>
                  <div className='bg-muted relative h-2.5 overflow-hidden rounded-full'>
                    <div
                      className='absolute inset-y-0 left-0 bg-blue-500 transition-all duration-300'
                      style={{ width: `${(currentClass.mana / currentClass.maxMana) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DiceRoller
          diceBank={currentAvailableDice}
          onRoll={handleRoll}
          isRolling={isWaitingForResolve}
          customButtonLabel={rollButtonLabel}
          title={isAttacking ? t('combat.to_battle') : undefined}
          diceLimit={diceLimit}
        />

        <div className='space-y-4 text-center'>
          {/* Show attack dice block - pending (rolling locally) OR submitted (waiting for backend) OR resolved */}
          {(pendingAttackRolls ||
            (isAttacking && submittedAttackRolls) ||
            (showResults && !!lastTurnResult?.playerAttackRolls?.length)) && (
            <div className='rounded-lg border p-4'>
              <div className='mb-2 text-sm font-medium'>{t('combat.attack_rolls')}</div>
              <div className='flex flex-wrap justify-center gap-2'>
                {/* Priority: pending > submitted > resolved */}
                {renderDice(pendingAttackRolls, submittedAttackRolls, lastTurnResult?.playerAttackRolls, 'atk')}
              </div>
            </div>
          )}

          {/* Show defense dice block - pending (rolling locally) OR submitted (waiting for backend) OR resolved */}
          {(pendingDefenseRolls ||
            (isAttacking && submittedDefenseRolls) ||
            (showResults && !!lastTurnResult?.playerDefenseRolls?.length)) && (
            <div className='rounded-lg border p-4'>
              <div className='mb-2 text-sm font-medium'>{t('combat.defense_rolls')}</div>
              <div className='flex flex-wrap justify-center gap-2'>
                {/* Priority: pending > submitted > resolved */}
                {renderDice(pendingDefenseRolls, submittedDefenseRolls, lastTurnResult?.playerDefenseRolls, 'def')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center: Enemies + Combat Log */}
      <div className='flex flex-col gap-4'>
        <div className='rounded-lg border p-4'>
          <h3 className='mb-3 font-semibold'>{t('combat.enemies')}</h3>
          <ScrollArea className='h-full max-h-[264px]'>
            <div className='grid gap-3 pr-4 sm:grid-cols-2 lg:grid-cols-3'>
              {enemies.map((enemy) => (
                <EnemyCard key={enemy.id} enemy={enemy} isTarget={targetEnemy?.id === enemy.id} />
              ))}
            </div>
          </ScrollArea>
        </div>

        <CombatLog entries={combatLog} className='max-h-[350px] min-h-[300px]' />
      </div>

      <AlertDialog open={isDead}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('combat.death_dialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('combat.death_dialog.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => navigate('/inventory')}>
              {t('combat.death_dialog.continue')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
