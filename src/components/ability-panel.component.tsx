'use client'
import EmptyState from '@/components/empty-state.component'
import { panelChrome } from '@/components/rpg/rpg-styles'
import Button from '@/components/ui/button.component'
import { cn } from '@/lib/cn.lib'
import { MagicNature } from '@/shared/constants/classes.constants'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import type { AbilityAttributeType, AbilityDefinition } from '@shared/types/ability.types'
import { useMutation, useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import { Loader, Trophy, Zap } from 'pixelarticons/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

const MAGIC_NATURE_COLORS: Record<MagicNature, string> = {
  [MagicNature.FORM]: 'bg-blue-400/10 text-blue-400',
  [MagicNature.VOID]: 'bg-red-400/10 text-red-400'
}

const ATTRIBUTE_COLORS: Record<AbilityAttributeType, string> = {
  LIGHT: 'bg-yellow-400/10 text-yellow-400',
  FIRE: 'bg-orange-400/10 text-orange-400',
  METAL: 'bg-zinc-400/10 text-zinc-400',
  WATER: 'bg-cyan-400/10 text-cyan-400',
  EARTH: 'bg-amber-600/10 text-amber-600',
  AIR: 'bg-teal-400/10 text-teal-400',
  LIGHTNING: 'bg-violet-400/10 text-violet-400',
  DARKNESS: 'bg-purple-400/10 text-purple-400',
  ICE: 'bg-sky-300/10 text-sky-300',
  MIND: 'bg-pink-400/10 text-pink-400'
}

function AbilityImage({ abilityId, alt }: { abilityId: string; alt: string }) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return <Zap className="h-6 w-6 text-muted-foreground" />
  }

  return (
    <Image
      src={`/assets/abilities/${abilityId}.png`}
      alt={alt}
      width={56}
      height={56}
      className="h-full w-full object-contain"
      style={{ imageRendering: 'pixelated' }}
      onError={() => setHasError(true)}
    />
  )
}

interface AbilityPanelProps {
  // Show equip/unequip controls (for inventory page)
  showEquipControls?: boolean
  // Show use button (for combat arena)
  showUseControls?: boolean
  // Current mana for determining if ability can be used
  currentMana?: number
  // Callback when ability is used in combat
  onUseAbility?: (ability: AbilityDefinition) => void
  // Pending state for use action
  isUsingAbility?: boolean
  // Display abilities horizontally (for below game scene layout)
  horizontal?: boolean
  className?: string
}

export default function AbilityPanel({
  showEquipControls = false,
  showUseControls = false,
  currentMana = 0,
  onUseAbility,
  isUsingAbility = false,
  horizontal = false,
  className
}: AbilityPanelProps) {
  const { t } = useTranslation()

  const { data: availableAbilities = [] } = useQuery({
    ...trpcOptions.character.getAvailableAbilities.queryOptions()
  })

  const { data: equippedAbilities = [] } = useQuery({
    ...trpcOptions.character.equippedAbilities.queryOptions()
  })

  const equipMutation = useMutation({
    ...trpcOptions.character.equipAbility.mutationOptions(),
    onSuccess: () => {
      toast.success(t('abilities.success.equip'))
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.equippedAbilities.queryKey() })
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getAvailableAbilities.queryKey() })
    },
    onError: () => {
      toast.error(t('abilities.error.equip'))
    }
  })

  const unequipMutation = useMutation({
    ...trpcOptions.character.unequipAbility.mutationOptions(),
    onSuccess: () => {
      toast.success(t('abilities.success.unequip'))
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.equippedAbilities.queryKey() })
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getAvailableAbilities.queryKey() })
    },
    onError: () => {
      toast.error(t('abilities.error.unequip'))
    }
  })

  const handleEquip = (abilityId: string) => {
    if (equippedAbilities.length >= 2) {
      toast.error(t('abilities.max_equipped'))
      return
    }

    equipMutation.mutate({ abilityId })
  }

  const handleUnequip = (abilityId: string) => {
    unequipMutation.mutate({ abilityId })
  }

  const handleUse = (ability: AbilityDefinition) => {
    if (currentMana < ability.manaCost) {
      toast.error(t('abilities.error.not_enough_mana'))
      return
    }

    onUseAbility?.(ability)
  }

  const isEquipped = (abilityId: string) => equippedAbilities.some((d) => d.id === abilityId)

  const renderAbilityCard = (ability: AbilityDefinition, isEquippedAbility: boolean) => {
    const canUse = currentMana >= ability.manaCost

    return (
      <div
        key={ability.id}
        className={cn(
          panelChrome,
          'flex min-w-0 items-start gap-3 p-3 transition-all',
          ability.isUltimate && 'border-amber-500/50'
        )}
      >
        <div className="bg-muted/50 relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded border p-1">
          <AbilityImage abilityId={ability.id} alt={t(ability.nameKey)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {ability.isUltimate && <Trophy className="h-4 w-4 shrink-0 text-amber-500" />}
            <span className="truncate font-medium">{t(ability.nameKey)}</span>
          </div>
          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{t(ability.descriptionKey)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="flex items-center gap-1 text-blue-500">
              <Zap className="h-3 w-3" />
              {t('abilities.mana_cost', { cost: ability.manaCost })}
            </span>
            {ability.magicNature !== 'universal' && (
              <span
                className={`rounded-full border border-current/20 px-2 py-0.5 text-xs font-bold capitalize ${MAGIC_NATURE_COLORS[ability.magicNature]}`}
              >
                {t(`abilities.magic_nature.${ability.magicNature}`)}
              </span>
            )}
            <span
              className={`rounded-full border border-current/20 px-2 py-0.5 text-xs font-bold capitalize ${ATTRIBUTE_COLORS[ability.attribute]}`}
            >
              {t(`abilities.attribute.${ability.attribute}`)}
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-xs font-bold text-white/70">
              {t('abilities.tier', { tier: ability.tier })}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          {showEquipControls &&
            (isEquippedAbility ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleUnequip(ability.id)}
                disabled={unequipMutation.isPending}
              >
                {t('abilities.unequip')}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEquip(ability.id)}
                disabled={equipMutation.isPending || equippedAbilities.length >= 2}
              >
                {t('abilities.equip')}
              </Button>
            ))}
          {showUseControls && isEquippedAbility && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUse(ability)}
              disabled={!canUse || isUsingAbility}
              className={cn((!canUse || isUsingAbility) && 'opacity-50')}
            >
              {isUsingAbility ? <Loader className="h-3 w-3 animate-spin" /> : t('abilities.use')}
            </Button>
          )}
        </div>
      </div>
    )
  }

  // For combat: only show equipped abilities
  if (showUseControls && !showEquipControls) {
    if (horizontal) {
      return (
        <div className={cn('flex flex-1 flex-col gap-2', className)}>
          {equippedAbilities.length === 0 ? (
            <p className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
              {t('abilities.empty_equipped')}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {equippedAbilities.map((ability) => renderAbilityCard(ability, true))}
            </div>
          )}
        </div>
      )
    }

    return (
      <div className={cn(panelChrome, 'p-4', className)}>
        <div className="mb-2 text-sm font-medium tracking-wider text-purple-500/80 uppercase">
          {t('abilities.title')}
        </div>
        {equippedAbilities.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('abilities.empty_equipped')}</p>
        ) : (
          <div className="space-y-2">{equippedAbilities.map((ability) => renderAbilityCard(ability, true))}</div>
        )}
      </div>
    )
  }

  // For inventory: show all available abilities with equip controls
  const unequippedAvailable = availableAbilities.filter((d) => !isEquipped(d.id))

  return (
    <div className={cn('space-y-4', className)}>
      {/* Equipped Abilities */}
      <div className={cn(panelChrome, 'p-4')}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">{t('abilities.equipped')}</h3>
          <span className="text-muted-foreground text-sm">{equippedAbilities.length}/2</span>
        </div>
        {equippedAbilities.length === 0 ? (
          <EmptyState
            size="compact"
            icon={<Zap className="h-5 w-5" />}
            title={t('abilities.empty_state.equipped.title')}
            description={t('abilities.empty_state.equipped.description')}
          />
        ) : (
          <div className="space-y-2">{equippedAbilities.map((ability) => renderAbilityCard(ability, true))}</div>
        )}
      </div>

      {/* Available Abilities */}
      <div className={cn(panelChrome, 'p-4')}>
        <h3 className="mb-3 font-semibold">{t('abilities.available')}</h3>
        {unequippedAvailable.length === 0 ? (
          <EmptyState
            size="compact"
            icon={<Trophy className="h-5 w-5" />}
            title={t('abilities.empty_state.available.title')}
            description={t('abilities.empty_state.available.description')}
          />
        ) : (
          <div className="space-y-2">{unequippedAvailable.map((ability) => renderAbilityCard(ability, false))}</div>
        )}
      </div>
    </div>
  )
}
