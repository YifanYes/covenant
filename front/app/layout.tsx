import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/common/theme-provider.component";
import Toaster from "@/components/ui/toaster.component";
import { TRPCProvider } from "./providers/trpc-provider";
import { I18nProvider } from "./providers/i18n-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arq - Gamified Productivity",
  description: "Level up your productivity with Arq",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <I18nProvider>
          <TRPCProvider>
            <ThemeProvider>
              <Toaster />
              {children}
            </ThemeProvider>
          </TRPCProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
