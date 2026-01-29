'use client'

import { trpcOptions } from '@/utils/trpc.utils'
import { Faction } from '@shared/constants/activities'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'

export type FactionTheme = Faction

const FACTION_TO_CLASS: Record<Faction, string> = {
  [Faction.HOLY_KNIGHTS]: 'faction-holy-knights',
  [Faction.LEGION]: 'faction-legion',
  [Faction.ALCHEMISTS_LEAGUE]: 'faction-alchemists-league',
  [Faction.DEATH_MARCH]: 'faction-death-march',
  [Faction.CRIMSON_INQUISITION]: 'faction-crimson-inquisition',
  [Faction.BLOOD_PACT]: 'faction-blood-pact'
}

export const STORAGE_KEY = 'arq-faction-theme'

type FactionThemeContextType = {
  faction: Faction
  setFaction: (faction: Faction) => void
  factionClass: string
}

export const FactionThemeContext = createContext<FactionThemeContextType | undefined>(undefined)

export function useFactionTheme() {
  const context = useContext(FactionThemeContext)
  if (context === undefined) {
    throw new Error('useFactionTheme must be used within a FactionThemeProvider')
  }
  return context
}

export function useFactionThemeProvider({ initialFaction }: { initialFaction: Faction }) {
  const [overrideFaction, setOverrideFaction] = useState<Faction | null>(null)
  const { data: profile } = useQuery(trpcOptions.auth.getProfile.queryOptions())
  const updateThemeMutation = useMutation(trpcOptions.auth.updateTheme.mutationOptions())
  const lastSyncedTheme = useRef<string | null>(null)
  const faction = overrideFaction || (profile?.theme as Faction) || initialFaction

  const syncStorage = (value: string) => {
    localStorage.setItem(STORAGE_KEY, value)
    document.cookie = `${STORAGE_KEY}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
  }

  const setFaction = (newFaction: Faction) => {
    setOverrideFaction(newFaction)
    syncStorage(newFaction)
    updateThemeMutation.mutate({ theme: newFaction })
  }

  if (overrideFaction !== null && profile?.theme === overrideFaction) {
    setOverrideFaction(null)
  }

  useEffect(() => {
    if (!profile?.theme || profile.theme === lastSyncedTheme.current) return

    syncStorage(profile.theme)
    lastSyncedTheme.current = profile.theme
  }, [profile?.theme])

  useLayoutEffect(() => {
    const root = document.documentElement
    const body = document.body

    Object.values(FACTION_TO_CLASS).forEach((cls) => {
      root.classList.remove(cls)
      body.classList.remove(cls)
    })

    const cls = FACTION_TO_CLASS[faction]
    if (cls) {
      root.classList.add(cls)
      body.classList.add(cls)
    }
  }, [faction])

  return { faction, setFaction, factionClass: FACTION_TO_CLASS[faction] }
}

export default useFactionTheme
