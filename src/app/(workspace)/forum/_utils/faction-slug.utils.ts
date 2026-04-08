import { Faction } from '@shared/constants/activities'

export function factionToKebab(faction: string): string {
  return faction.toLowerCase().replace(/_/g, '-')
}

export function kebabToFaction(slug: string): Faction {
  const value = slug.toUpperCase().replace(/-/g, '_')
  if (!Object.values(Faction).includes(value as Faction)) {
    throw new Error(`Invalid faction slug: ${slug}`)
  }
  return value as Faction
}
