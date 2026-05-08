'use client'

import { ErrorBoundary as SentryErrorBoundary } from '@sentry/nextjs'

export function SentryProvider({ children }: { children: React.ReactNode }) {
  return (
    <SentryErrorBoundary
      fallback={({ resetError }) => {
        return (
          <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
            <h1 className="font-cinzel text-3xl font-bold text-destructive">
              The realm has encountered a calamity
            </h1>
            <p className="text-muted-foreground max-w-md">
              A critical error has disrupted the flow of magic. Our scribes have
              been alerted and are working to restore order.
            </p>
            <button
              onClick={resetError}
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded px-4 py-2 font-medium transition-colors"
            >
              Attempt Resurrection
            </button>
          </div>
        )
      }}
    >
      {children}
    </SentryErrorBoundary>
  )
}
