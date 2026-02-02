import createMDX from '@next/mdx'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['shared'],
  experimental: {
    optimizePackageImports: ['@nsmr/pixelart-react', 'recharts']
  },
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx']
}

const withMDX = createMDX({})

export default withMDX(nextConfig)
