import { SentryProvider } from '@/components/common/sentry-provider.component'
import ThemeProvider, { Theme } from '@/components/common/theme-provider.component'
import Toaster from '@/components/ui/toaster.component'
import { Faction } from '@/shared/constants/factions.constants'
import { SITE_URL } from '@/shared/constants/site.constants'
import type { Metadata } from 'next'
import { Cinzel, EB_Garamond, Geist, Geist_Mono, Pixelify_Sans, Press_Start_2P } from 'next/font/google'
import { cookies, headers } from 'next/headers'
import './globals.css'
import { I18nProvider } from './providers/i18n-provider'
import { TRPCProvider } from './providers/trpc-provider'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
})

const ebGaramond = EB_Garamond({
  variable: '--font-eb-garamond',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800']
})

const cinzel = Cinzel({
  variable: '--font-cinzel',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900']
})

const pixelifySans = Pixelify_Sans({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-rpg-body',
  display: 'swap'
})

const pressStart2P = Press_Start_2P({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-rpg-display',
  display: 'swap'
})

// Helper to get preferred language from headers
function getParsedHeadersLang(acceptLang: string | null) {
  if (!acceptLang) return 'en'
  const firstLang = acceptLang.split(',')[0].split('-')[0]
  return ['en', 'es'].includes(firstLang) ? firstLang : 'en'
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Covenant - Gamified Productivity',
  description: 'Level up your productivity with Covenant',
  icons: { icon: '/covenant-logo.svg' }
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const headerStore = await headers()

  const theme = cookieStore.get('theme')?.value || 'light'
  const faction = cookieStore.get('covenant-faction-theme')?.value || Faction.HOLY_KNIGHTS
  const lang = cookieStore.get('i18nextLng')?.value || getParsedHeadersLang(headerStore.get('accept-language'))

  const factionClass = `faction-${faction.toLowerCase().replace(/_/g, '-')}`

  return (
    <html lang={lang} className={`${theme} ${factionClass}`} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${ebGaramond.variable} ${cinzel.variable} ${pixelifySans.variable} ${pressStart2P.variable} ${factionClass} antialiased`}
        suppressHydrationWarning
      >
        <I18nProvider initialLang={lang}>
          <SentryProvider>
            <TRPCProvider>
              <ThemeProvider initialTheme={theme as Theme} initialFaction={faction as Faction}>
                <Toaster />
                {children}
              </ThemeProvider>
            </TRPCProvider>
          </SentryProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
