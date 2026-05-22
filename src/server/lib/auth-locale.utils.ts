import type { GenericEndpointContext } from 'better-auth'
import { prisma } from './prisma'

export const SUPPORTED_LOCALES = ['en', 'es'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: SupportedLocale = 'es'

export function validateLocale(value: string | null | undefined): SupportedLocale {
  if (value && (SUPPORTED_LOCALES as readonly string[]).includes(value)) {
    return value as SupportedLocale
  }
  return DEFAULT_LOCALE
}

export function extractLocaleFromCallbackURL(callbackURL: string | undefined): SupportedLocale | null {
  if (!callbackURL) return null
  try {
    const url = new URL(callbackURL)
    const raw = url.searchParams.get('locale')
    if (!raw) return null
    if (!(SUPPORTED_LOCALES as readonly string[]).includes(raw)) return null
    return validateLocale(raw)
  } catch {
    return null
  }
}

export async function resolveEmailLocale(email: string, ctx?: GenericEndpointContext): Promise<SupportedLocale> {
  const stored = await prisma.user.findUnique({
    where: { email },
    select: { userSettings: { select: { locale: true } } }
  })
  if (stored?.userSettings?.locale) {
    return validateLocale(stored.userSettings.locale)
  }

  const callbackURL = ctx?.query?.callbackURL as string | undefined
  const urlLocale = extractLocaleFromCallbackURL(callbackURL)
  if (urlLocale) return urlLocale

  const cookieLocale = ctx?.getCookie?.('i18nextLng')
  if (cookieLocale) return validateLocale(cookieLocale)

  return DEFAULT_LOCALE
}

export async function resolveCreateUserLocale(ctx?: GenericEndpointContext): Promise<SupportedLocale> {
  const callbackURL = ctx?.query?.callbackURL as string | undefined
  const urlLocale = extractLocaleFromCallbackURL(callbackURL)
  if (urlLocale) return urlLocale

  const cookieLocale = ctx?.getCookie?.('i18nextLng')
  if (cookieLocale) return validateLocale(cookieLocale)

  return DEFAULT_LOCALE
}
