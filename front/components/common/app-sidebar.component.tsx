'use client'
import ArqLogo from '@/components/common/arq-logo.component'
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
import { BookOpen, Coin, Dashboard, List, Luggage, Map, Sliders, Store, Trophy } from '@nsmr/pixelart-react'
import Link from 'next/link'
import type { ElementType } from 'react'
import { useTranslation } from 'react-i18next'

interface SidebarItem {
  title: string
  url: string
  icon: ElementType
}

function SidebarSection({ title, items }: { title?: string; items: SidebarItem[] }) {
  return (
    <SidebarGroup>
      {title && <SidebarGroupLabel className="font-title text-sidebar-foreground">{title}</SidebarGroupLabel>}
      <SidebarGroupContent>
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
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export default function AppSidebar() {
  const { t } = useTranslation()

  const sidebarItems = {
    productivity: [
      {
        title: t('sidebar.dashboard'),
        url: '/dashboard',
        icon: Dashboard
      },
      {
        title: t('sidebar.objectives'),
        url: '/objectives',
        icon: Trophy
      },
      {
        title: t('sidebar.tasks'),
        url: '/tasks',
        icon: List
      },
      {
        title: t('sidebar.habits'),
        url: '/habits',
        icon: BookOpen
      }
    ],
    rpg: [
      {
        title: t('sidebar.inventory'),
        url: '/inventory',
        icon: Luggage
      },
      {
        title: t('sidebar.map'),
        url: '/map',
        icon: Map
      },
      {
        title: t('sidebar.investments'),
        url: '/investments',
        icon: Coin
      },
      {
        title: t('sidebar.shop'),
        url: '/shop',
        icon: Store
      }
    ],
    settings: [
      {
        title: t('sidebar.settings'),
        url: '/settings',
        icon: Sliders
      }
    ]
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/"
          className="group/logo flex h-fit w-full items-end gap-3 justify-start p-2 mt-2 transition-all duration-300 hover:scale-105 active:scale-95 origin-left group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:origin-center"
        >
          <ArqLogo className="h-9 shrink-0 transition-colors duration-300 group-hover/logo:bg-primary group-data-[collapsible=icon]:h-7" />
          <span
            className="font-title font-medium text-2xl tracking-widest transition-colors duration-300 group-hover/logo:text-primary inline-block group-data-[collapsible=icon]:hidden"
            style={{ fontFamily: 'var(--font-cinzel)' }}
          >
            Arq
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarSection title={t('sidebar.productivity')} items={sidebarItems.productivity} />
        <SidebarSection title={t('sidebar.rpg')} items={sidebarItems.rpg} />
        <Separator />
        <SidebarSection items={sidebarItems.settings} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarTrigger />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
