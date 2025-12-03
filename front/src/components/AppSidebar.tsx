import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger
} from '@/components/ui/sidebar'
import { Backpack, BookCheck, LayoutDashboard, List, Settings, Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Separator } from './ui/separator'

export function AppSidebar() {
  const { t } = useTranslation()

  const sidebarItems = {
    content: [
      {
        title: t('sidebar.dashboard'),
        url: '/dashboard',
        icon: LayoutDashboard
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
        icon: BookCheck
      },
      {
        title: t('sidebar.inventory'),
        url: '/inventory',
        icon: Backpack
      }
    ],
    settings: [
      {
        title: t('sidebar.settings'),
        url: '/settings',
        icon: Settings
      }
    ]
  }

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <div className='relative flex h-12 items-center justify-center px-2 pt-2 group-data-[collapsible=icon]:px-0'>
          <img
            src='/logo.png'
            alt='logo'
            className='absolute top-2 left-2 h-8 w-auto object-contain transition-opacity duration-200 group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0'
          />
          <img
            src='/favicon.ico'
            alt='logo'
            className='absolute top-1/2 left-1/2 h-10 w-auto -translate-x-1/2 -translate-y-1/2 object-contain opacity-0 brightness-75 grayscale transition-opacity duration-200 group-data-[collapsible=icon]:pointer-events-auto group-data-[collapsible=icon]:opacity-100'
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.content.map((item) => (
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
        <Separator />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.settings.map((item) => (
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
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarTrigger className='w-full justify-start' showText />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
