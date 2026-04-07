'use client'
import CombatActionBar from '@/components/combat/combat-action-bar.component'
import EnemyDisplay from '@/components/combat/enemy-display.component'
import PlayerDisplay from '@/components/combat/player-display.component'
import AlertDialog, {
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/ui/alert-dialog.component'
import { useCombat } from '@/hooks/use-combat.hook'
import { cn } from '@/lib/cn.lib'
import type { CombatLogEntry, EnemyState, InventoryCharacter } from '@shared/types/gamification.types'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'

interface CombatArenaProps {
  character: InventoryCharacter
  enemies: EnemyState[]
  combatLog: CombatLogEntry[]
  diceBank: number
  participationId: string
  failureText?: string
  className?: string
}

export default function CombatArena({
  character,
  enemies,
  combatLog,
  diceBank,
  participationId,
  failureText,
  className
}: CombatArenaProps) {
  const { t } = useTranslation()
  const router = useRouter()

  const combat = useCombat(character, participationId, enemies, combatLog, diceBank)

  const handleTargetSelect = (targetIdOrAll: string) => {
    if (combat.selectedDoctrineId) {
      // Doctrine targeting
      if (targetIdOrAll === 'all') {
        const allEnemyIds = combat.enemies.filter((e) => e.currentHealth > 0).map((e) => e.id)
        combat.castDoctrine(combat.selectedDoctrineId, allEnemyIds)
      } else {
        combat.castDoctrine(combat.selectedDoctrineId, [targetIdOrAll])
      }
    } else {
      // Direct attack
      combat.attack(targetIdOrAll)
    }
  }

  const isPlayerTurn = combat.phase === 'player_input'

  return (
    <div className={cn('flex flex-col overflow-hidden', className)}>
      {/* Centered arena container */}
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-2 p-4">
        {/* Battlefield: enemy top-right, player bottom-left */}
        <div className="flex flex-col gap-4 rounded-lg border p-4">
          {/* Enemy: pushed to the right */}
          <div className="flex justify-end">
            <EnemyDisplay
              enemies={combat.enemies}
              animation={combat.animation}
              damageNumbers={combat.damageNumbers}
              targetingMode={
                isPlayerTurn && (combat.targetingMode || combat.attackRolls)
                  ? combat.targetingMode ?? 'single'
                  : null
              }
              onSelectTarget={handleTargetSelect}
              className="w-80"
            />
          </div>

          {/* Player: pushed to the left */}
          <div className="flex flex-col gap-1">
            <PlayerDisplay
              name={character.name}
              currentClass={character.currentClass}
              health={combat.playerHealth}
              maxHealth={combat.playerMaxHealth}
              mana={combat.playerMana}
              maxMana={combat.playerMaxMana}
              tier={character.tier}
              magicNature={character.magicNature}
              animation={combat.animation}
              damageNumbers={combat.damageNumbers}
              className="w-96"
            />

            {/* Phase indicator */}
            <div className="text-muted-foreground text-center text-xs">
              {combat.phase === 'player_input' && t('combat.player_turn')}
              {combat.phase === 'enemy_turn' && t('combat.enemy_turn')}
              {combat.phase === 'animating' && '...'}
            </div>
          </div>
        </div>

        {/* Bottom: Action bar — full width of the centered container */}
        <CombatActionBar
          character={character}
          diceBank={combat.diceBank}
          attackRolls={combat.attackRolls}
          defenseRolls={combat.defenseRolls}
          isRolling={combat.isRolling}
          onRollDice={combat.rollDice}
          onAttack={combat.attack}
          onSelectDoctrine={combat.selectDoctrine}
          onUsePotion={combat.usePotion}
          onCancelDoctrine={combat.cancelDoctrine}
          selectedDoctrineId={combat.selectedDoctrineId}
          targetingMode={combat.targetingMode}
          potionUsedThisTurn={combat.potionUsedThisTurn}
          isLoading={combat.isLoading}
          disabled={!isPlayerTurn}
          enemies={combat.enemies}
        />
      </div>

      {/* Victory Dialog */}
      <AlertDialog open={combat.phase === 'victory'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('combat.result_dialog.success_title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('combat.result_dialog.success_description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => router.push('/map')}>
              {t('combat.result_dialog.continue')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Defeat Dialog */}
      <AlertDialog open={combat.phase === 'defeat'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('combat.death_dialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {failureText ? t(failureText) : t('combat.death_dialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => router.push('/map')}>
              {t('combat.death_dialog.continue')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
