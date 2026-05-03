import ThemeProvider, { Theme } from '@/components/common/theme-provider.component'
import Toaster from '@/components/ui/toaster.component'
import { Faction } from '@shared/constants/activities'
import type { Metadata } from 'next'
import { Cinzel, EB_Garamond, Geist, Geist_Mono } from 'next/font/google'
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

// Helper to get preferred language from headers
function getParsedHeadersLang(acceptLang: string | null) {
  if (!acceptLang) return 'en'
  const firstLang = acceptLang.split(',')[0].split('-')[0]
  return ['en', 'es'].includes(firstLang) ? firstLang : 'en'
}

export const metadata: Metadata = {
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
        className={`${geistSans.variable} ${geistMono.variable} ${ebGaramond.variable} ${cinzel.variable} ${factionClass} antialiased`}
      >
        <I18nProvider initialLang={lang}>
          <TRPCProvider>
            <ThemeProvider initialTheme={theme as Theme} initialFaction={faction as Faction}>
              <Toaster />
              {children}
            </ThemeProvider>
          </TRPCProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
