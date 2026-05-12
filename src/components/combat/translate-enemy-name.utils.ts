import type { TFunction } from 'i18next'

export function translateEnemyName(t: TFunction, name: string | undefined): string {
  if (!name) return t('combat.unknown_enemy')
  if (name.includes('|')) {
    const [prefix, suffix] = name.split('|')
    return `${t(prefix)} ${t(suffix)}`
  }
  return t(name)
}
