'use client'

import DropdownMenu, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/ui/dropdown-menu.component'
import { SidebarMenuButton, SidebarMenuItem } from '@/ui/sidebar.component'
import { useAuthStore } from '@/stores/auth.store'
import { trpcOptions } from '@/utils/trpc.utils'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Logout, User } from 'pixelarticons/react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export default function UserMenu() {
  const { t } = useTranslation()
  const { email, signOut } = useAuthStore()
  const { data: character } = useQuery(trpcOptions.character.getCurrentClass.queryOptions())

  const [menuOpen, setMenuOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => setMenuOpen(false), 150)
  }
  const openMenu = () => {
    cancelClose()
    setMenuOpen(true)
  }

  const handleLogout = () => {
    // Hard navigation clears better-auth's in-memory session atom and React Query cache.
    // router.push would leave the stale session in nanostore, causing the login page to
    // redirect back to a protected route and loop until the atom refetches.
    signOut()
      .then(() => {
        window.location.assign('/login')
      })
      .catch(() => toast.error(t('settings.logout_error')))
  }

  const displayName = character?.name ?? email
  const tooltip = character?.name ? `${character.name} · ${email}` : email

  return (
    <SidebarMenuItem onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            asChild
            tooltip={tooltip}
            aria-label={t('user_menu.aria')}
            className="cursor-pointer"
          >
            <Link href="/profile">
              <User />
              <span className="truncate font-title">{displayName}</span>
            </Link>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="right"
          align="end"
          className="min-w-48"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            {character?.name && <span className="font-medium">{character.name}</span>}
            <span className="text-muted-foreground truncate text-xs font-normal">{email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer" onSelect={handleLogout}>
            <Logout />
            {t('settings.logout_button')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}
