import createMDX from '@next/mdx'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['pg', 'pino', 'pino-pretty', 'node-cron'],
  experimental: {
    optimizePackageImports: ['@nsmr/pixelart-react', 'recharts']
  },
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx']
}

const withMDX = createMDX({})

export default withMDX(nextConfig)
