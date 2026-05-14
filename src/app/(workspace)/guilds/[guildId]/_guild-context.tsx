'use client'
import type { RouterOutputs } from '@/types/trpc.types'
import { createContext, useContext, type ReactNode } from 'react'

type MyGuildData = NonNullable<RouterOutputs['guilds']['getMyGuild']>

type GuildContextValue = {
  guild: MyGuildData['guild']
  myRole: MyGuildData['myRole']
  myUserId: string
  isOwner: boolean
  canManage: boolean
}

const GuildContext = createContext<GuildContextValue | null>(null)

export function GuildProvider({ value, children }: { value: GuildContextValue; children: ReactNode }) {
  return <GuildContext.Provider value={value}>{children}</GuildContext.Provider>
}

export function useGuild(): GuildContextValue {
  const ctx = useContext(GuildContext)
  if (!ctx) throw new Error('useGuild must be used within GuildProvider')
  return ctx
}
