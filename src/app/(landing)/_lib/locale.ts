import { cookies, headers } from 'next/headers'

export const SUPPORTED_LOCALES = ['en', 'es'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

const isSupported = (v: string | undefined): v is SupportedLocale =>
  !!v && (SUPPORTED_LOCALES as readonly string[]).includes(v)

function parseAcceptLanguage(header: string | null): SupportedLocale {
  if (!header) return 'en'
  const first = header.split(',')[0]?.split('-')[0]?.trim()
  return isSupported(first) ? first : 'en'
}

export async function getLandingLocale(): Promise<SupportedLocale> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])
  const cookieLang = cookieStore.get('i18nextLng')?.value
  if (isSupported(cookieLang)) return cookieLang
  return parseAcceptLanguage(headerStore.get('accept-language'))
}
