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
import Link from 'next/link'
import { BookOpen, Bulletlist, Castle, Grid3x3, Settings2, Store, Suitcase, Trophy } from 'pixelarticons/react'
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
