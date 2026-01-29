'use client'

import { useTranslation } from 'react-i18next'
import { Zap } from '@nsmr/pixelart-react'

import { useTacticalCombatStore } from '@/stores/tactical-combat.store'
import { useTacticalDoctrine } from '@/hooks/use-tactical-doctrine.hook'
import { DOCTRINES } from '@shared/constants/doctrines'
import { getDoctrineRange, getDoctrineAoEPattern, type AoEPatternType } from '@shared/constants/aoe-patterns'
import Button from '@/components/ui/button.component'
import { cn } from '@/lib/cn.lib'
import type { TacticalUnit } from '@shared/types/tactical-combat.types'

interface DoctrineTargetSelectorProps {
  activeUnit: TacticalUnit
  equippedDoctrines: string[]
}

export default function DoctrineTargetSelector({ activeUnit, equippedDoctrines }: DoctrineTargetSelectorProps) {
  const { t } = useTranslation()
  const {
    selectedDoctrineId,
    pendingAction,
    phase,
    selectDoctrine,
    clearDoctrineSelection
  } = useTacticalCombatStore()

  const { confirmDoctrine, confirmSelfBuff, getPendingDoctrineInfo, isSelfBuffDoctrine, isLoading } = useTacticalDoctrine()

  const pendingInfo = getPendingDoctrineInfo()

  // Get available doctrines (equipped and have enough mana)
  const availableDoctrines = equippedDoctrines
    .map((id) => DOCTRINES[id])
    .filter((d) => d !== undefined)

  // Handle doctrine click - self-buffs are cast immediately, others go to targeting mode
  const handleDoctrineClick = async (doctrineId: string) => {
    if (isSelfBuffDoctrine(doctrineId)) {
      // Self-buff - cast immediately without targeting
      await confirmSelfBuff(doctrineId)
    } else {
      // Needs targeting - enter target selection mode
      selectDoctrine(doctrineId)
    }
  }

  // Render doctrine selection UI
  if (phase === 'select_action' && !selectedDoctrineId) {
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t('combat.doctrines', 'Doctrines')}
        </h4>

        {availableDoctrines.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            {t('combat.no_doctrines', 'No doctrines equipped')}
          </p>
        ) : (
          <div className="space-y-1">
            {availableDoctrines.map((doctrine) => {
              const hasEnoughMana = activeUnit.currentMana >= doctrine.manaCost
              const pattern = getDoctrineAoEPattern(doctrine.id)
              const isSelfBuff = isSelfBuffDoctrine(doctrine.id)

              return (
                <Button
                  key={doctrine.id}
                  variant="outline"
                  size="sm"
                  className={cn(
                    'w-full justify-start text-left',
                    !hasEnoughMana && 'opacity-50',
                    isSelfBuff && 'border-amber-500/50'
                  )}
                  disabled={!hasEnoughMana || activeUnit.hasActed || isLoading}
                  onClick={() => handleDoctrineClick(doctrine.id)}
                >
                  <DoctrineIcon className="w-4 h-4 mr-2 text-purple-400" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-xs">
                      {t(doctrine.nameKey)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-xs text-blue-400 flex items-center">
                      <Zap className="w-3 h-3 mr-0.5" />
                      {doctrine.manaCost}
                    </span>
                    {isSelfBuff ? (
                      <span className="text-xs text-amber-400">
                        {t('combat.self_buff', 'Self')}
                      </span>
                    ) : pattern !== 'SINGLE' && (
                      <span className="text-xs text-purple-400">
                        {t(getPatternI18nKey(pattern), pattern)}
                      </span>
                    )}
                  </div>
                </Button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Render doctrine targeting UI
  if (phase === 'select_target' && selectedDoctrineId && pendingAction?.type === 'doctrine') {
    const doctrine = DOCTRINES[selectedDoctrineId]
    if (!doctrine) return null

    const range = getDoctrineRange(selectedDoctrineId)
    const pattern = getDoctrineAoEPattern(selectedDoctrineId)

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">{t(doctrine.nameKey)}</h4>
          <span className="text-xs text-blue-400 flex items-center">
            <Zap className="w-3 h-3 mr-0.5" />
            {doctrine.manaCost}
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          {t(doctrine.descriptionKey)}
        </p>

        {/* Targeting info */}
        <div className="bg-muted/50 rounded p-2 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('tactical.range')}</span>
            <span>{range} {t('tactical.tiles')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('tactical.pattern', 'Pattern')}</span>
            <span className="text-purple-400">{t(getPatternI18nKey(pattern), pattern)}</span>
          </div>
        </div>

        {/* Show affected targets */}
        {pendingInfo?.affectedUnits && pendingInfo.affectedUnits.length > 0 && (
          <div className="bg-red-950/30 border border-red-500/30 rounded p-2 text-xs">
            <div className="text-red-400 font-medium mb-1">
              {t('tactical.targets_affected', 'Targets Affected')}: {pendingInfo.affectedUnits.length}
            </div>
          </div>
        )}

        {/* Instructions */}
        <p className="text-xs text-muted-foreground text-center">
          {pendingAction.targetPosition
            ? t('tactical.click_confirm_doctrine', 'Click Confirm to cast')
            : t('tactical.click_to_target_doctrine', 'Click a tile to target')}
        </p>

        {/* Confirm/Cancel buttons */}
        <div className="space-y-2">
          <Button
            variant="default"
            size="sm"
            className="w-full bg-purple-600 hover:bg-purple-700"
            disabled={isLoading || !pendingAction.targetPosition || !pendingInfo?.canCast}
            onClick={() => confirmDoctrine()}
          >
            {isLoading ? t('tactical.casting') : t('confirm')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={isLoading}
            onClick={clearDoctrineSelection}
          >
            {t('cancel')}
          </Button>
        </div>
      </div>
    )
  }

  return null
}

// Helper function to get i18n key for pattern label
function getPatternI18nKey(pattern: AoEPatternType): string {
  switch (pattern) {
    case 'SINGLE':
      return 'tactical.pattern_single'
    case 'CROSS':
      return 'tactical.pattern_cross'
    case 'DIAMOND':
      return 'tactical.pattern_diamond'
    case 'LINE_3':
      return 'tactical.pattern_line'
    case 'CONE':
      return 'tactical.pattern_cone'
    case 'CIRCLE_2':
      return 'tactical.pattern_circle'
    default:
      return pattern
  }
}

// Doctrine icon component
function DoctrineIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}
