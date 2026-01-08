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
import { BookOpen, Dashboard, List, Luggage, Sliders, Trophy } from '@nsmr/pixelart-react'
import { useTranslation } from 'react-i18next'
import { Separator } from './ui/separator'

export function AppSidebar() {
  const { t } = useTranslation()

  const sidebarItems = {
    content: [
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
      },
      {
        title: t('sidebar.adventure'),
        url: '/adventure/inventory',
        icon: Luggage
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
          <SidebarTrigger />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
