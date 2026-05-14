'use client'

import { ConfirmDeleteAccountDialog } from '@/common/confirm-delete-account-dialog.component'
import EditProfileDialog from '@/common/edit-profile-dialog.component'
import DropdownMenu, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/ui/dropdown-menu.component'
import { SidebarMenuButton, SidebarMenuItem } from '@/ui/sidebar.component'
import { useAuthStore } from '@/stores/auth.store'
import { useTutorialStore } from '@/stores/tutorial.store'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Delete, Logout, Reload, User } from 'pixelarticons/react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export default function UserMenu() {
  const { t } = useTranslation()
  const router = useRouter()
  const { email, signOut } = useAuthStore()
  const { data: character } = useQuery(trpcOptions.character.getCurrentClass.queryOptions())
  const reopen = useTutorialStore((s) => s.reopen)

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
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

  const resetTutorialMutation = useMutation(
    trpcOptions.character.resetTutorial.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() })
        reopen()
      },
      onError: () => toast.error(t('settings.replay_tutorial_error'))
    })
  )

  const handleLogout = () => {
    signOut()
      .then(() => router.push('/login'))
      .catch(() => toast.error(t('settings.logout_error')))
  }

  const displayName = character?.name ?? email
  const tooltip = character?.name ? `${character.name} · ${email}` : email

  return (
    <>
      <SidebarMenuItem onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              tooltip={tooltip}
              aria-label={t('user_menu.aria')}
              className="cursor-pointer"
            >
              <User />
              <span className="truncate font-title">{displayName}</span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="end"
            className="min-w-56"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              {character?.name && <span className="font-medium">{character.name}</span>}
              <span className="text-muted-foreground truncate text-xs font-normal">{email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {character?.name && (
              <DropdownMenuItem className="cursor-pointer" onSelect={() => setEditOpen(true)}>
                <User />
                {t('user_menu.edit_name')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="cursor-pointer"
              onSelect={() => resetTutorialMutation.mutate()}
              disabled={resetTutorialMutation.isPending}
            >
              <Reload />
              {t('settings.replay_tutorial')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" variant="destructive" onSelect={() => setDeleteOpen(true)}>
              <Delete />
              {t('confirm_delete_account_dialog.button')}
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onSelect={handleLogout}>
              <Logout />
              {t('settings.logout_button')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      {character?.name && (
        <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} initialName={character.name} />
      )}
      <ConfirmDeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  )
}
