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
import { cn } from '@/lib/cn.lib'
import ScrollArea from '@/ui/scroll-area.component'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { getConsumableById } from '@shared/constants/items'
import {
  ItemType,
  type CombatLogEntry,
  type EnemyState,
  type InventoryCharacter
} from '@shared/types/gamification.types'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
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

  // Item stats
  const armor = character?.loadout?.find((item) => item.type === ItemType.ARMOR)
  const armorDice = armor?.stats?.physicalDefDice || armor?.stats?.magicDefDice || 1

  const weapon = character?.loadout?.find(
    (item) =>
      item.type === ItemType.WEAPON_MELEE || item.type === ItemType.WEAPON_RANGED || item.type === ItemType.WEAPON_MAGIC
  )
  const weaponDice = weapon?.stats?.attackDice || 1

  const targetEnemy = enemies.find((e) => e.currentHealth > 0)

  // Use custom hook for combat logic
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
    },
    onError: () => {
      toast.error(t('consumables.error'))
    }
  })

  const inventoryConsumables = character.inventory.filter((item) => item.type === ItemType.CONSUMABLE)

  // Group consumables by definitionId and count
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

  // Helper to render dice groups
  const renderDice = (
    pending: number[] | undefined,
    submitted: number[] | undefined,
    resolved: { value: number; isSuccess: boolean; isCritical: boolean }[] | undefined,
    prefix: string
  ) => {
    // 1. Pending (User just rolled, local only)
    if (pending) {
      return pending.map((v, i) => (
        <DiceResult key={`${prefix}-p-${i}`} value={v} isSuccess={false} isCritical={false} isRolling />
      ))
    }
    // 2. Submitted (Waiting for backend)
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
    // 3. Resolved (Backend result)
    return resolved?.map((r, i) => (
      <DiceResult key={`${prefix}-${i}`} value={r.value} isSuccess={r.isSuccess} isCritical={r.isCritical} />
    ))
  }

  if (!currentClass) return null
  const rollButtonLabel = isAttackPhase ? t('combat.roll_attack') : t('combat.roll_defense')

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
          {/* Attack Dice Section */}
          {(pendingAttackRolls ||
            submittedAttackRolls ||
            (showResults && !!lastTurnResult?.playerAttackRolls?.length)) && (
            <div className='rounded-lg border p-4 transition-all duration-300'>
              <div className='mb-2 text-sm font-medium tracking-wider text-orange-500/80 uppercase'>
                {t('combat.attack_rolls')}
              </div>
              <div className='flex flex-wrap justify-center gap-2'>
                {renderDice(pendingAttackRolls, submittedAttackRolls, lastTurnResult?.playerAttackRolls, 'atk')}
              </div>
            </div>
          )}

          {/* Defense Dice Section */}
          {(pendingDefenseRolls ||
            submittedDefenseRolls ||
            (showResults && !!lastTurnResult?.playerDefenseRolls?.length)) && (
            <div className='rounded-lg border p-4 transition-all duration-300'>
              <div className='mb-2 text-sm font-medium tracking-wider text-blue-500/80 uppercase'>
                {t('combat.defense_rolls')}
              </div>
              <div className='flex flex-wrap justify-center gap-2'>
                {renderDice(pendingDefenseRolls, submittedDefenseRolls, lastTurnResult?.playerDefenseRolls, 'def')}
              </div>
            </div>
          )}
        </div>

        {/* Consumables Section */}
        {Object.keys(groupedConsumables).length > 0 && (
          <div className='rounded-lg border p-4'>
            <div className='mb-2 text-sm font-medium tracking-wider text-green-500/80 uppercase'>
              {t('consumables.title')}
            </div>
            <div className='flex flex-wrap gap-2'>
              {Object.entries(groupedConsumables).map(([defId, { item, count }]) => {
                const definition = getConsumableById(defId)
                return (
                  <Button
                    key={defId}
                    variant='outline'
                    size='sm'
                    disabled={useConsumableMutation.isPending}
                    onClick={() => useConsumableMutation.mutate({ consumableId: defId })}
                    className='flex items-center gap-2'
                  >
                    <span>{t(definition?.nameKey || item.nameKey)}</span>
                    <span className='text-muted-foreground'>×{count}</span>
                  </Button>
                )
              })}
            </div>
          </div>
        )}
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
