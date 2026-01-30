'use client'

import { Zap } from '@nsmr/pixelart-react'
import { useTranslation } from 'react-i18next'

import Button from '@/components/ui/button.component'
import { useTacticalDoctrine } from '@/hooks/use-tactical-doctrine.hook'
import { useTacticalCombatStore } from '@/stores/tactical-combat.store'
import { getDoctrineAoEPattern, getDoctrineRange, type AoEPatternType } from '@shared/constants/aoe-patterns'
import { DOCTRINES } from '@shared/constants/doctrines'
export default function DoctrineTargetSelector() {
  const { t } = useTranslation()
  const { selectedDoctrineId, pendingAction, phase, clearDoctrineSelection } = useTacticalCombatStore()

  const { confirmDoctrine, getPendingDoctrineInfo, isLoading } = useTacticalDoctrine()

  const pendingInfo = getPendingDoctrineInfo()

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

        <p className="text-xs text-muted-foreground">{t(doctrine.descriptionKey)}</p>

        {/* Targeting info */}
        <div className="bg-muted/50 rounded p-2 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('tactical.range')}</span>
            <span>
              {range} {t('tactical.tiles')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('tactical.pattern')}</span>
            <span className="text-purple-400">{t(getPatternI18nKey(pattern))}</span>
          </div>
        </div>

        {/* Show affected targets */}
        {pendingInfo?.affectedUnits && pendingInfo.affectedUnits.length > 0 && (
          <div className="bg-red-950/30 border border-red-500/30 rounded p-2 text-xs">
            <div className="text-red-400 font-medium mb-1">
              {t('tactical.targets_affected')}: {pendingInfo.affectedUnits.length}
            </div>
          </div>
        )}

        {/* Instructions */}
        <p className="text-xs text-muted-foreground text-center">
          {pendingAction.targetPosition
            ? t('tactical.click_confirm_doctrine')
            : t('tactical.click_to_target_doctrine')}
        </p>

        {/* Confirm/Cancel buttons */}
        <div className="space-y-2">
          <Button
            variant="default"
            size="sm"
            className="w-full bg-purple-800 hover:bg-purple-900 text-gray-100"
            disabled={isLoading || !pendingAction.targetPosition || !pendingInfo?.canCast}
            onClick={() => confirmDoctrine()}
          >
            {isLoading ? t('tactical.casting') : t('confirm')}
          </Button>
          <Button variant="outline" size="sm" className="w-full" disabled={isLoading} onClick={clearDoctrineSelection}>
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
