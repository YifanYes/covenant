'use client'
import LoaderButton from '@/common/loader-button.component'
import Card, { CardContent, CardHeader, CardTitle } from '@/ui/card.component'
import ScrollArea from '@/ui/scroll-area.component'
import Separator from '@/ui/separator.component'
import { ShoppingCart as Cart, Money } from 'pixelarticons/react'
import type { ItemDefinition } from '@shared/constants/items'
import { ItemType } from '@shared/types/gamification.types'
import { useTranslation } from 'react-i18next'
import CartItem from './cart-item.component'

interface CartPanelProps {
  items: ItemDefinition[]
  total: number
  maxGold: number
  isLoading: boolean
  consumableQuantities: Record<string, number>
  onRemove: (itemId: string) => void
  onBuy: () => void
}

export default function CartPanel({
  items,
  total,
  maxGold,
  isLoading,
  consumableQuantities,
  onRemove,
  onBuy
}: CartPanelProps) {
  const { t } = useTranslation()
  const isEmpty = items.length === 0
  const canBuy = !isEmpty && total <= maxGold

  return (
    <Card className="flex w-80 shrink-0 flex-col gap-2 overflow-hidden">
      <CardHeader className="shrink-0">
        <CardTitle className="flex items-center gap-2">
          <Cart className="h-5 w-5" />
          {t('store.cart')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col overflow-hidden px-6 py-0">
        <div className="flex min-h-0 flex-1 items-center justify-center pt-1 pb-2">
          {isEmpty ? (
            <div className="text-muted-foreground text-sm">{t('store.empty_cart')}</div>
          ) : (
            <ScrollArea className="h-full w-full">
              <div className="space-y-3 pt-2 pr-5 pb-3">
                {items.map((item) => {
                  const quantity = item.type === ItemType.CONSUMABLE ? consumableQuantities[item.id] || 1 : undefined
                  return <CartItem key={item.id} item={item} quantity={quantity} onRemove={() => onRemove(item.id)} />
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <Separator className="border-muted-background my-3 w-auto border" />

        <div className="border-muted-foreground shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('store.total')}</span>
            <span className="flex items-center gap-1 font-semibold">
              <Money className="h-4 w-4 text-yellow-500" />
              {total}
            </span>
          </div>
          <LoaderButton
            className="w-full"
            disabled={!canBuy}
            isLoading={isLoading}
            onClick={onBuy}
            label={isLoading ? t('store.buying') : t('store.buy')}
          />
        </div>
      </CardContent>
    </Card>
  )
}
