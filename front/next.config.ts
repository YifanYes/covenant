import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['shared'],
  experimental: {
    optimizePackageImports: ['@nsmr/pixelart-react', 'recharts']
  }
}

export default nextConfig
