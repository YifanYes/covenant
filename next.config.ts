import createMDX from '@next/mdx'
import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

// Baseline security headers applied to every route. CSP intentionally omitted for now
// (Next.js + Google OAuth + Sentry tunneling each require allowlist work that's worth a
// dedicated pass); revisit once those surface areas are stable.
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  }
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['pg', 'pino', 'pino-pretty', 'node-cron'],
  experimental: {
    optimizePackageImports: ['pixelarticons/react', 'recharts']
  },
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  }
}

const withMDX = createMDX({})

export default withSentryConfig(withMDX(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: process.env.SENTRY_ORG || 'covenant-06',

  project: process.env.SENTRY_PROJECT || 'javascript-nextjs',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: '/monitoring',

  webpack: {
    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true
    }
  }
})
