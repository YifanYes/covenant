'use client'
import CovenantLogo from '@/components/common/covenant-logo.component'
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
import { BookOpen, Chat, Coin, Dashboard, Dice, List, Luggage, Map, Sliders, Store, Trophy } from '@nsmr/pixelart-react'
import Link from 'next/link'
import { useSyncExternalStore, type ElementType } from 'react'
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
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  if (!mounted) {
    return (
      <Sidebar collapsible="icon">
        <SidebarHeader className="h-[60px]" />
        <SidebarContent />
        <SidebarFooter className="h-[48px]" />
      </Sidebar>
    )
  }

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
      },
      {
        title: t('sidebar.crafting'),
        url: '/crafting',
        icon: Dice
      },
      {
        title: t('sidebar.forum'),
        url: '/forum',
        icon: Chat
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
