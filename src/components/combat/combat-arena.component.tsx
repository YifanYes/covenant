'use client'
import CombatActionBar from '@/components/combat/combat-action-bar.component'
import { panelChrome } from '@/components/rpg/rpg-styles'
import EnemyInfo from '@/components/combat/enemy-info.component'
import EnemySprite from '@/components/combat/enemy-sprite.component'
import PlayerInfo from '@/components/combat/player-info.component'
import PlayerSprite from '@/components/combat/player-sprite.component'
import { translateEnemyName } from '@/components/combat/translate-enemy-name.utils'
import { useCombat } from '@/hooks/use-combat.hook'
import { cn } from '@/lib/cn.lib'
import AlertDialog, {
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/ui/alert-dialog.component'
import {
  CombatLogType,
  type CombatLogEntry,
  type EnemyState,
  type InventoryCharacter
} from '@shared/types/gamification.types'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const LOG_TYPE_TO_KEY: Partial<Record<CombatLogType, string>> = {
  [CombatLogType.PLAYER_ATTACK]: 'combat.log.player_attack',
  [CombatLogType.PLAYER_HITS]: 'combat.log.player_hits',
  [CombatLogType.ENEMY_DEFENDS]: 'combat.log.enemy_defends',
  [CombatLogType.ENEMY_ATTACKS]: 'combat.log.enemy_attacks',
  [CombatLogType.PLAYER_DEFENDS]: 'combat.log.player_defends',
  [CombatLogType.DAMAGE_TO_ENEMY]: 'combat.log.damage_to_enemy',
  [CombatLogType.DAMAGE_TO_PLAYER]: 'combat.log.damage_to_player',
  [CombatLogType.MANA_REGEN]: 'combat.log.mana_regen',
  [CombatLogType.ENEMY_DEFEATED]: 'combat.log.enemy_defeated',
  [CombatLogType.STATUS_EFFECT]: 'combat.log.status_effect',
  [CombatLogType.ABILITY_EFFECT]: 'combat.log.ability_effect',
  [CombatLogType.STATUS_EXPIRED]: 'combat.log.status_expired'
}

interface MessageBoxProps {
  phase: string
  targetingMode: 'single' | 'all' | null
  combatLog: CombatLogEntry[]
  manaReserve: number
  className?: string
}

function MessageBox({ phase, targetingMode, combatLog, manaReserve, className }: MessageBoxProps) {
  const { t } = useTranslation()

  if (phase === 'victory' || phase === 'defeat') return null

  const latestLog = combatLog[combatLog.length - 1]
  const logKey = latestLog ? LOG_TYPE_TO_KEY[latestLog.type] : undefined

  const primaryText = targetingMode
    ? targetingMode === 'all'
      ? t('combat.targeting.all')
      : t('combat.targeting.single')
    : phase === 'player_input'
      ? t('combat.player_turn')
      : phase === 'enemy_turn'
        ? t('combat.enemy_turn')
        : '...'

  return (
    <div className={cn(panelChrome, 'flex flex-col gap-1 p-3', className)}>
      <p className="text-sm font-medium">{primaryText}</p>
      {logKey && (
        <p className="text-muted-foreground line-clamp-2 text-xs">
          {t(logKey, {
            ...(latestLog.data as Record<string, unknown>),
            ...(typeof latestLog.data?.enemy === 'string' && {
              enemy: translateEnemyName(t, latestLog.data.enemy)
            })
          })}
        </p>
      )}
      <p className="text-primary mt-auto text-[10px] font-bold tracking-widest">
        {t('combat.mana_reserve')}: {manaReserve}
      </p>
    </div>
  )
}

interface CombatArenaProps {
  character: InventoryCharacter
  enemies: EnemyState[]
  combatLog: CombatLogEntry[]
  questId: string
  sceneId?: string
  failureText?: string
  className?: string
}

export default function CombatArena({
  character,
  enemies,
  combatLog,
  questId,
  sceneId,
  failureText,
  className
}: CombatArenaProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [imageError, setImageError] = useState(false)

  const combat = useCombat(character, questId, enemies, combatLog)

  const handleTargetSelect = (targetIdOrAll: string) => {
    if (combat.selectedMoveId) {
      if (targetIdOrAll === 'all') {
        const allEnemyIds = combat.enemies.filter((e) => e.currentHealth > 0).map((e) => e.id)
        combat.executeMove(combat.selectedMoveId, allEnemyIds)
      } else {
        combat.executeMove(combat.selectedMoveId, [targetIdOrAll])
      }
    } else {
      combat.attack(targetIdOrAll)
    }
  }

  const isPlayerTurn = combat.phase === 'player_input'
  const spriteTargetingMode: 'single' | 'all' | null =
    isPlayerTurn && combat.targetingMode ? (combat.targetingMode ?? 'single') : null

  return (
    <div className={cn('flex flex-col gap-3 overflow-hidden', className)}>
      <div className="relative h-72 w-full overflow-hidden rounded-lg">
        <div className="absolute inset-0 bg-gradient-to-b from-card via-background to-muted" />

        {!imageError && sceneId && (
          <Image
            fill
            priority
            src={`/assets/scenes/${sceneId}.png`}
            alt=""
            className="object-cover"
            sizes="100vw"
            onError={() => setImageError(true)}
          />
        )}

        {/* Sprite-contrast overlay: dims top + bottom of scene so HP bars
            and sprites read clearly, leaves mid-band scenery visible. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-black/55" />

        <div className="relative grid h-full grid-cols-12 grid-rows-6 gap-2 p-4">
          <div className="col-start-1 col-end-6 row-start-1 row-end-3 flex flex-col gap-1">
            {combat.enemies.map((enemy) => (
              <EnemyInfo key={enemy.id} enemy={enemy} />
            ))}
          </div>

          <div className="col-start-8 col-end-13 row-start-2 row-end-4 flex items-end justify-center gap-2">
            {combat.enemies.map((enemy) => (
              <EnemySprite
                key={enemy.id}
                enemy={enemy}
                animation={combat.animation}
                damageNumbers={combat.damageNumbers}
                targetingMode={spriteTargetingMode}
                onSelectTarget={handleTargetSelect}
              />
            ))}
          </div>

          <div className="col-start-1 col-end-5 row-start-4 row-end-6 flex items-end justify-center">
            <PlayerSprite
              currentClass={character.currentClass}
              name={character.name}
              animation={combat.animation}
              damageNumbers={combat.damageNumbers}
            />
          </div>

          <div className="col-start-7 col-end-13 row-start-5 row-end-7 flex items-end">
            <PlayerInfo
              name={character.name}
              tier={character.tier}
              magicNature={character.magicNature}
              health={combat.playerHealth}
              maxHealth={combat.playerMaxHealth}
              mana={combat.playerMana}
              maxMana={combat.playerMaxMana}
              manaReserve={combat.manaReserve}
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="flex min-h-28 shrink-0 items-stretch gap-3">
        <MessageBox
          phase={combat.phase}
          targetingMode={combat.targetingMode}
          combatLog={combat.combatLog}
          manaReserve={combat.manaReserve}
          className="flex-[2]"
        />
        <CombatActionBar
          character={character}
          currentMana={combat.playerMana}
          onSelectMove={combat.selectMove}
          onUsePotion={combat.usePotion}
          onCancelMove={combat.cancelMove}
          selectedMoveId={combat.selectedMoveId}
          targetingMode={combat.targetingMode}
          potionUsedThisTurn={combat.potionUsedThisTurn}
          isLoading={combat.isLoading}
          disabled={!isPlayerTurn}
          className="flex-[1.2]"
        />
      </div>

      <AlertDialog open={combat.phase === 'victory'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('combat.result_dialog.success_title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('combat.result_dialog.success_description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => router.push('/quests')}>
              {t('combat.result_dialog.continue')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={combat.phase === 'defeat'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('combat.death_dialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {failureText ? t(failureText) : t('combat.death_dialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => router.push('/quests')}>
              {t('combat.death_dialog.continue')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
