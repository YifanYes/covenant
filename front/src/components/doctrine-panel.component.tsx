import Button from '@/components/ui/button.component'
import { cn } from '@/lib/cn.lib'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { Loader, Trophy, Zap } from '@nsmr/pixelart-react'
import type { DoctrineDefinition } from '@shared/types/doctrine.types'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface DoctrinePanelProps {
  // Show equip/unequip controls (for inventory page)
  showEquipControls?: boolean
  // Show use button (for combat arena)
  showUseControls?: boolean
  // Current mana for determining if doctrine can be used
  currentMana?: number
  // Callback when doctrine is used in combat
  onUseDoctrine?: (doctrine: DoctrineDefinition) => void
  // Pending state for use action
  isUsingDoctrine?: boolean
  className?: string
}

export default function DoctrinePanel({
  showEquipControls = false,
  showUseControls = false,
  currentMana = 0,
  onUseDoctrine,
  isUsingDoctrine = false,
  className
}: DoctrinePanelProps) {
  const { t } = useTranslation()

  const { data: availableDoctrines = [] } = useQuery({
    ...trpc.character.getAvailableDoctrines.queryOptions()
  })

  const { data: equippedDoctrines = [] } = useQuery({
    ...trpc.character.equippedDoctrines.queryOptions()
  })

  const equipMutation = useMutation({
    ...trpc.character.equipDoctrine.mutationOptions(),
    onSuccess: () => {
      toast.success(t('doctrines.success.equip'))
      queryClient.invalidateQueries({ queryKey: trpc.character.equippedDoctrines.queryKey() })
      queryClient.invalidateQueries({ queryKey: trpc.character.getAvailableDoctrines.queryKey() })
    },
    onError: () => {
      toast.error(t('doctrines.error.equip'))
    }
  })

  const unequipMutation = useMutation({
    ...trpc.character.unequipDoctrine.mutationOptions(),
    onSuccess: () => {
      toast.success(t('doctrines.success.unequip'))
      queryClient.invalidateQueries({ queryKey: trpc.character.equippedDoctrines.queryKey() })
      queryClient.invalidateQueries({ queryKey: trpc.character.getAvailableDoctrines.queryKey() })
    },
    onError: () => {
      toast.error(t('doctrines.error.unequip'))
    }
  })

  const handleEquip = (doctrineId: string) => {
    if (equippedDoctrines.length >= 2) {
      toast.error(t('doctrines.max_equipped'))
      return
    }

    equipMutation.mutate({ doctrineId })
  }

  const handleUnequip = (doctrineId: string) => {
    unequipMutation.mutate({ doctrineId })
  }

  const handleUse = (doctrine: DoctrineDefinition) => {
    if (currentMana < doctrine.manaCost) {
      toast.error(t('doctrines.error.not_enough_mana'))
      return
    }

    onUseDoctrine?.(doctrine)
  }

  const isEquipped = (doctrineId: string) => equippedDoctrines.some((d) => d.id === doctrineId)

  const renderDoctrineCard = (doctrine: DoctrineDefinition, isEquippedDoctrine: boolean) => {
    const canUse = currentMana >= doctrine.manaCost

    return (
      <div
        key={doctrine.id}
        className={cn('rounded-lg border p-3 transition-all', doctrine.isUltimate && 'border-amber-500/50')}
      >
        <div className='flex items-start justify-between gap-2'>
          <div className='flex-1'>
            <div className='flex items-center gap-2'>
              {doctrine.isUltimate && <Trophy className='h-4 w-4 text-amber-500' />}
              <span className='font-medium'>{t(doctrine.nameKey)}</span>
            </div>
            <p className='text-muted-foreground mt-1 text-xs'>{t(doctrine.descriptionKey)}</p>
            <div className='mt-2 flex items-center gap-2 text-xs'>
              <span className='flex items-center gap-1 text-blue-500'>
                <Zap className='h-3 w-3' />
                {t('doctrines.mana_cost', { cost: doctrine.manaCost })}
              </span>
              <span className='text-muted-foreground'>{t(`doctrines.magic_nature.${doctrine.magicNature}`)}</span>
            </div>
          </div>

          <div className='flex flex-col gap-1'>
            {showEquipControls &&
              (isEquippedDoctrine ? (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => handleUnequip(doctrine.id)}
                  disabled={unequipMutation.isPending}
                >
                  {t('doctrines.unequip')}
                </Button>
              ) : (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => handleEquip(doctrine.id)}
                  disabled={equipMutation.isPending || equippedDoctrines.length >= 2}
                >
                  {t('doctrines.equip')}
                </Button>
              ))}

            {showUseControls && isEquippedDoctrine && (
              <Button
                variant='secondary'
                size='sm'
                onClick={() => handleUse(doctrine)}
                disabled={!canUse || isUsingDoctrine}
                className={cn((!canUse || isUsingDoctrine) && 'opacity-50')}
              >
                {isUsingDoctrine ? <Loader className='h-3 w-3 animate-spin' /> : t('doctrines.use')}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // For combat: only show equipped doctrines
  if (showUseControls && !showEquipControls) {
    if (equippedDoctrines.length === 0) {
      return null
    }

    return (
      <div className={cn('rounded-lg border p-4', className)}>
        <div className='mb-2 text-sm font-medium tracking-wider text-purple-500/80 uppercase'>
          {t('doctrines.title')}
        </div>
        <div className='space-y-2'>{equippedDoctrines.map((doctrine) => renderDoctrineCard(doctrine, true))}</div>
      </div>
    )
  }

  // For inventory: show all available doctrines with equip controls
  return (
    <div className={cn('space-y-4', className)}>
      {/* Equipped Doctrines */}
      <div className='rounded-lg border p-4'>
        <div className='mb-3 flex items-center justify-between'>
          <h3 className='font-semibold'>{t('doctrines.equipped')}</h3>
          <span className='text-muted-foreground text-sm'>{equippedDoctrines.length}/2</span>
        </div>
        {equippedDoctrines.length === 0 ? (
          <p className='text-muted-foreground text-sm'>{t('doctrines.empty_equipped')}</p>
        ) : (
          <div className='space-y-2'>{equippedDoctrines.map((doctrine) => renderDoctrineCard(doctrine, true))}</div>
        )}
      </div>

      {/* Available Doctrines */}
      <div className='rounded-lg border p-4'>
        <h3 className='mb-3 font-semibold'>{t('doctrines.available')}</h3>
        {availableDoctrines.length === 0 ? (
          <p className='text-muted-foreground text-sm'>{t('doctrines.no_doctrines')}</p>
        ) : (
          <div className='space-y-2'>
            {availableDoctrines.filter((d) => !isEquipped(d.id)).map((doctrine) => renderDoctrineCard(doctrine, false))}
          </div>
        )}
      </div>
    </div>
  )
}
