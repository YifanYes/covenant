'use client'

import CovenantLogo from '@/components/common/covenant-logo.component'
import UserMenu from '@/components/common/user-menu.component'
import { useManaReserveTooltip } from '@/hooks/use-mana-reserve-tooltip.hook'
import { useSidebarUIStore } from '@/stores/sidebar-ui.store'
import Collapsible, { CollapsibleContent, CollapsibleTrigger } from '@/ui/collapsible.component'
import Separator from '@/ui/separator.component'
import Sidebar, {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger
} from '@/ui/sidebar.component'
import Tooltip, { TooltipContent, TooltipTrigger } from '@/ui/tooltip.component'
import { trpcOptions } from '@/utils/trpc.utils'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Battery, BookOpen, Bulletlist, Calendar, Castle, ChevronDown, Coffee, Grid3x3, PenSquare, Settings2, Shield, Store, Suitcase, Trophy } from 'pixelarticons/react'
import { useSyncExternalStore, type ElementType } from 'react'
import { useTranslation } from 'react-i18next'

interface SidebarItem {
  title: string
  url: string
  icon: ElementType
}

function SidebarSectionMenu({ items }: { items: SidebarItem[] }) {
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild tooltip={item.title}>
            <Link href={item.url}>
              <item.icon />
              <span className="font-title">{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}

function SidebarSection({ title, items, collapsibleId }: { title?: string; items: SidebarItem[]; collapsibleId?: string }) {
  const open = useSidebarUIStore((s) => (collapsibleId ? (s.sectionsOpen[collapsibleId] ?? true) : true))
  const setSectionOpen = useSidebarUIStore((s) => s.setSectionOpen)

  if (!collapsibleId) {
    return (
      <SidebarGroup>
        {title && <SidebarGroupLabel className="font-title text-sidebar-foreground">{title}</SidebarGroupLabel>}
        <SidebarGroupContent>
          <SidebarSectionMenu items={items} />
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={(v) => setSectionOpen(collapsibleId, v)} className="group/collapsible">
      <SidebarGroup>
        <SidebarGroupLabel asChild className="font-title text-sidebar-foreground">
          <CollapsibleTrigger className="flex w-full items-center">
            {title}
            <ChevronDown className="ml-auto h-3 w-3 transition-transform group-data-[state=closed]/collapsible:-rotate-90" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarSectionMenu items={items} />
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}

function ManaIndicator() {
  const { data: character } = useQuery({ ...trpcOptions.character.getCurrentClass.queryOptions() })
  const manaReserve = character?.manaReserve ?? 0
  const tooltip = useManaReserveTooltip(manaReserve)
  if (!character) return null
  const currentClass = character.classes.find((c) => c.className === character.currentClass)
  if (!currentClass) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex cursor-pointer items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:hidden">
          <Battery className="h-3 w-3 text-blue-400" />
          <span className="text-xs font-medium">
            {currentClass.mana}/{currentClass.maxMana}
          </span>
          {manaReserve > 0 && (
            <span className="rounded bg-blue-500/20 px-1 text-[10px] font-bold text-blue-300">
              +{manaReserve}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" align="center" className="max-w-xs whitespace-pre-line text-left">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

export default function AppSidebar() {
  const { t } = useTranslation()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  if (!mounted) {
    return (
      <Sidebar collapsible="icon">
        <SidebarHeader className="h-15" />
        <SidebarContent />
        <SidebarFooter className="h-12" />
      </Sidebar>
    )
  }

  const sidebarItems = {
    productivity: [
      {
        title: t('sidebar.dashboard'),
        url: '/dashboard',
        icon: Grid3x3
      },
      {
        title: t('sidebar.objectives'),
        url: '/objectives',
        icon: Trophy
      },
      {
        title: t('sidebar.tasks'),
        url: '/tasks',
        icon: Bulletlist
      },
      {
        title: t('sidebar.habits'),
        url: '/habits',
        icon: BookOpen
      },
      {
        title: t('sidebar.journaling'),
        url: '/journaling',
        icon: PenSquare
      },
      {
        title: t('sidebar.calendar'),
        url: '/calendar',
        icon: Calendar
      }
    ],
    rpg: [
      {
        title: t('sidebar.inventory'),
        url: '/inventory',
        icon: Suitcase
      },
      {
        title: t('sidebar.quests'),
        url: '/quests',
        icon: Castle
      },
      {
        title: t('sidebar.shop'),
        url: '/shop',
        icon: Store
      },
      {
        title: t('sidebar.guilds'),
        url: '/guilds',
        icon: Shield
      },
      {
        title: t('sidebar.tavern'),
        url: '/tavern',
        icon: Coffee
      }
    ],
    settings: [
      {
        title: t('sidebar.settings'),
        url: '/settings',
        icon: Settings2
      }
    ]
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/"
          className="group/logo flex h-fit w-full flex-col items-center gap-1 p-2 mt-2 transition-all duration-300 hover:scale-105 active:scale-95 group-data-[collapsible=icon]:p-1"
        >
          <CovenantLogo className="h-9 shrink-0 transition-colors duration-300 group-hover/logo:bg-primary group-data-[collapsible=icon]:h-7" />
          <span
            className="font-title font-medium text-sm tracking-[0.25em] uppercase transition-colors duration-300 group-hover/logo:text-primary group-data-[collapsible=icon]:hidden"
            style={{ fontFamily: 'var(--font-cinzel)' }}
          >
            Covenant
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarSection collapsibleId="productivity" title={t('sidebar.productivity')} items={sidebarItems.productivity} />
        <SidebarSection collapsibleId="rpg" title={t('sidebar.rpg')} items={sidebarItems.rpg} />
        <ManaIndicator />
        <Separator />
        <SidebarSection items={sidebarItems.settings} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <UserMenu />
          <SidebarTrigger />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
