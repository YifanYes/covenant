import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { trpc } from '@/utils/trpc.utils'
import { Cart, Clock, Luggage, ScriptText, User } from '@nsmr/pixelart-react'
import type { InventoryCharacter } from '@shared/types/gamification.types'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation } from 'react-router'

export default function AdventureLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const { data: characterData } = useSuspenseQuery(trpc.character.getCurrentClass.queryOptions())
  const character = characterData as InventoryCharacter
  const activeTab = ['missions', 'history', 'store'].find((tab) => location.pathname.includes(`/${tab}`)) ?? 'inventory'

  if (!character) {
    return (
      <div className='flex h-[calc(100vh-150px)] w-full flex-col items-center justify-center gap-4 p-4 text-center'>
        <div className='bg-primary/10 ring-primary/5 flex h-24 w-24 items-center justify-center rounded-full ring-8 transition-transform duration-300 hover:scale-110'>
          <User className='text-primary h-12 w-12' />
        </div>
        <div className='max-w-md space-y-2'>
          <h3 className='text-2xl font-bold tracking-tight'>{t('inventory.no_character.title')}</h3>
          <p className='text-muted-foreground text-lg leading-relaxed'>{t('inventory.no_character.description')}</p>
        </div>
        <Button
          size='sm'
          className='hover:shadow-primary/20 mt-2 px-5 py-4 font-semibold shadow-lg transition-all active:scale-95'
        >
          <Link to='/onboarding'>{t('inventory.no_character.button')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className='flex h-[calc(100vh-1rem)] w-full flex-col gap-4 overflow-hidden px-6 py-4 pr-2'>
      <div className='flex shrink-0 items-center justify-between'>
        <h1 className='text-3xl font-bold'>{t('adventure.title')}</h1>
      </div>

      <Tabs value={activeTab} className='flex min-h-0 flex-1 flex-col overflow-hidden'>
        <TabsList className='shrink-0'>
          <TabsTrigger value='inventory' asChild>
            <Link to='/adventure/inventory'>
              <Luggage className='mr-1 h-4 w-4' />
              {t('adventure.tabs.inventory')}
            </Link>
          </TabsTrigger>
          <TabsTrigger value='missions' asChild>
            <Link to='/adventure/missions'>
              <ScriptText className='mr-1 h-4 w-4' />
              {t('adventure.tabs.missions')}
            </Link>
          </TabsTrigger>
          <TabsTrigger value='history' asChild>
            <Link to='/adventure/history'>
              <Clock className='mr-1 h-4 w-4' />
              {t('adventure.tabs.history')}
            </Link>
          </TabsTrigger>
          <TabsTrigger value='store' asChild>
            <Link to='/adventure/store'>
              <Cart className='mr-1 h-4 w-4' />
              {t('adventure.tabs.store')}
            </Link>
          </TabsTrigger>
        </TabsList>

        <div className='mt-4 min-h-0 flex-1 overflow-hidden'>
          <Outlet />
        </div>
      </Tabs>
    </div>
  )
}
