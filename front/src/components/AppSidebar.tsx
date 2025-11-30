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
        <img src='/logo.png' alt='logo' width={120} className='p-2 pt-4 group-data-[collapsible=icon]:hidden' />
        <img src='/favicon.ico' alt='logo' width={40} className='hidden p-2 pt-4 group-data-[collapsible=icon]:block' />
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
