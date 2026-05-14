'use client'

import BaseConfirmDialog from '@/common/base-confirm-dialog.component'
import { panelChrome, rpgDialogContent } from '@/components/rpg/rpg-styles'
import { useSession } from '@/lib/auth.lib'
import { cn } from '@/lib/cn.lib'
import { Badge } from '@/ui/badge.component'
import Button from '@/ui/button.component'
import DropdownMenu, { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/ui/dropdown-menu.component'
import Popover, { PopoverContent, PopoverTrigger } from '@/ui/popover.component'
import { Progress } from '@/ui/progress.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { GuildRole } from '@shared/schemas/guilds.schemas'
import { useMutation, useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { redirect, useParams, usePathname, useRouter } from 'next/navigation'
import { Crown, Delete, Flag, Logout, MessageText, MoreVertical, Settings2, Users } from 'pixelarticons/react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { GuildProvider } from './_guild-context'

const TAB_SEGMENTS = ['forum', 'campaigns', 'members', 'settings'] as const
type TabSegment = (typeof TAB_SEGMENTS)[number]

function getActiveSegment(pathname: string, guildId: string): TabSegment | null {
  const base = `/guilds/${guildId}/`
  if (!pathname.startsWith(base)) return null
  const seg = pathname.slice(base.length).split('/')[0]
  return (TAB_SEGMENTS as readonly string[]).includes(seg) ? (seg as TabSegment) : null
}

function GuildTabLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-2 py-1 text-sm font-medium text-foreground transition',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        active
          ? 'bg-background shadow-sm dark:border-input dark:bg-input/30'
          : 'hover:bg-accent/40 hover:text-accent-foreground'
      )}
    >
      {children}
    </Link>
  )
}

export default function GuildLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const params = useParams<{ guildId: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [dissolveOpen, setDissolveOpen] = useState(false)

  const guildQuery = useQuery(trpcOptions.guilds.getMyGuild.queryOptions())
  const progressionQuery = useQuery(trpcOptions.guilds.getMyProgression.queryOptions())

  const leaveMutation = useMutation(
    trpcOptions.guilds.leave.mutationOptions({
      onSuccess: async () => {
        toast.success(t('guilds.success.leave'))
        await queryClient.invalidateQueries({ queryKey: trpcOptions.guilds.getMyGuild.queryKey() })
        router.push('/guilds')
      },
      onError: (error) => toast.error(t('guilds.error.leave'), { description: error.message })
    })
  )

  const dissolveMutation = useMutation(
    trpcOptions.guilds.dissolve.mutationOptions({
      onSuccess: async () => {
        toast.success(t('guilds.success.dissolve'))
        await queryClient.invalidateQueries({ queryKey: trpcOptions.guilds.getMyGuild.queryKey() })
        router.push('/guilds')
      },
      onError: (error) => toast.error(t('guilds.error.dissolve'), { description: error.message })
    })
  )

  if (guildQuery.isLoading) {
    return (
      <div className="min-h-screen w-full p-6 max-w-5xl mx-auto space-y-6">
        <div className={cn(panelChrome, 'px-4 py-3 animate-pulse')}>
          <div className="flex items-center gap-3">
            <div className="h-6 w-1/3 rounded bg-muted/30" />
            <div className="h-5 w-20 rounded-full bg-muted/20" />
          </div>
        </div>
      </div>
    )
  }

  const data = guildQuery.data
  if (!data || data.guild.id !== params.guildId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">{t('guilds.errors.not_member')}</p>
      </div>
    )
  }

  const { guild, myRole } = data
  const myUserId = session?.user?.id ?? ''
  const isOwner = myRole === GuildRole.OWNER
  const canManage = myRole === GuildRole.OWNER || myRole === GuildRole.OFFICER
  const fillPct = Math.min(100, Math.round((guild.members.length / Math.max(1, guild.capacity)) * 100))
  const roleLabel =
    myRole === GuildRole.OWNER
      ? t('guilds.role.owner')
      : myRole === GuildRole.OFFICER
        ? t('guilds.role.officer')
        : t('guilds.role.member')

  const activeSegment = getActiveSegment(pathname, guild.id)
  const tabHref = (segment: TabSegment) => `/guilds/${guild.id}/${segment}`

  if (activeSegment === 'settings' && !canManage) {
    redirect(`/guilds/${guild.id}/forum`)
  }

  const tierBadge = t('guilds.progression.tier_badge', {
    tier: progressionQuery.data?.tier ?? 1,
    max: progressionQuery.data?.maxTier ?? 1
  })

  return (
    <GuildProvider value={{ guild, myRole, myUserId, isOwner, canManage }}>
      <div className="min-h-screen w-full p-4 max-w-5xl mx-auto space-y-3">
        <header className={cn(panelChrome, 'px-4 py-3')}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="font-title text-lg truncate">{guild.name}</h1>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="mt-1 inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground transition hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                    aria-label={tierBadge}
                  >
                    {isOwner && <Crown className="h-3 w-3 text-accent" />}
                    <span>{tierBadge}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('guilds.role_label')}</span>
                    <Badge variant={isOwner ? 'default' : 'outline'} className="gap-1">
                      {isOwner && <Crown className="h-3 w-3" />}
                      {roleLabel}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {t('guilds.tabs.members')}
                      </span>
                      <span className="tabular-nums">
                        {guild.members.length} / {guild.capacity}
                      </span>
                    </div>
                    <Progress value={fillPct} className="h-1.5" />
                  </div>
                  {progressionQuery.data && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>
                          {t('guilds.progression.tier_badge', {
                            tier: progressionQuery.data.tier,
                            max: progressionQuery.data.maxTier
                          })}
                        </span>
                        <span className="tabular-nums">
                          {progressionQuery.data.nextThreshold !== null
                            ? t('guilds.progression.next', {
                                current: progressionQuery.data.totalContribution,
                                next: progressionQuery.data.nextThreshold
                              })
                            : t('guilds.progression.maxed', {
                                current: progressionQuery.data.totalContribution
                              })}
                        </span>
                      </div>
                      {progressionQuery.data.nextThreshold !== null && (
                        <Progress
                          value={Math.min(
                            100,
                            Math.round(
                              (progressionQuery.data.totalContribution /
                                Math.max(1, progressionQuery.data.nextThreshold)) *
                                100
                            )
                          )}
                          className="h-1.5"
                        />
                      )}
                      <p className="text-muted-foreground">
                        {progressionQuery.data.goldMultiplier > 1
                          ? t('guilds.progression.buff', {
                              pct: Math.round((progressionQuery.data.goldMultiplier - 1) * 100)
                            })
                          : t('guilds.progression.buff_locked')}
                      </p>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-1">
              <nav className="bg-muted inline-flex h-9 w-fit shrink-0 items-center justify-center rounded-lg p-0.75">
                <GuildTabLink href={tabHref('forum')} active={activeSegment === 'forum'}>
                  <MessageText className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('guilds.tabs.forum')}</span>
                </GuildTabLink>
                <GuildTabLink href={tabHref('campaigns')} active={activeSegment === 'campaigns'}>
                  <Flag className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('guilds.tabs.campaigns')}</span>
                </GuildTabLink>
                <GuildTabLink href={tabHref('members')} active={activeSegment === 'members'}>
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('guilds.tabs.members')}</span>
                  <span className="ml-0.5 rounded bg-muted/50 px-1 text-[10px] tabular-nums text-muted-foreground">
                    {guild.members.length}
                  </span>
                </GuildTabLink>
                {canManage && (
                  <GuildTabLink href={tabHref('settings')} active={activeSegment === 'settings'}>
                    <Settings2 className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('guilds.tabs.settings')}</span>
                  </GuildTabLink>
                )}
              </nav>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={t('guilds.actions')}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-40">
                  {!isOwner && (
                    <DropdownMenuItem onClick={() => setLeaveOpen(true)}>
                      <Logout className="h-4 w-4" />
                      <span>{t('guilds.leave')}</span>
                    </DropdownMenuItem>
                  )}
                  {isOwner && (
                    <DropdownMenuItem variant="destructive" onClick={() => setDissolveOpen(true)}>
                      <Delete className="h-4 w-4" />
                      <span>{t('guilds.dissolve')}</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <div className="mt-3">{children}</div>

        <BaseConfirmDialog
          open={leaveOpen}
          onOpenChange={setLeaveOpen}
          title="guilds.leave_confirm.title"
          description="guilds.leave_confirm.description"
          onConfirm={() => leaveMutation.mutate()}
          isLoading={leaveMutation.isPending}
          contentClassName={rpgDialogContent}
        />

        <BaseConfirmDialog
          open={dissolveOpen}
          onOpenChange={setDissolveOpen}
          title="guilds.dissolve_confirm.title"
          description="guilds.dissolve_confirm.description"
          onConfirm={() => dissolveMutation.mutate({ guildId: guild.id })}
          isLoading={dissolveMutation.isPending}
          contentClassName={rpgDialogContent}
        />
      </div>
    </GuildProvider>
  )
}
