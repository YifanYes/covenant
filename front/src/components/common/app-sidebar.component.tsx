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
      {title && <SidebarGroupLabel>{title}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title}>
                <a href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </a>
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
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <div className='flex h-16 w-full items-center justify-start px-4 group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0'>
          <div
            style={{
              maskImage: 'url(/arq-logo.svg)',
              maskRepeat: 'no-repeat',
              maskSize: 'contain',
              maskPosition: 'center',
              WebkitMaskImage: 'url(/arq-logo.svg)',
              WebkitMaskRepeat: 'no-repeat',
              WebkitMaskSize: 'contain',
              WebkitMaskPosition: 'center'
            }}
            className='bg-foreground h-12 w-32 transition-all duration-200 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9'
          />
        </div>
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
