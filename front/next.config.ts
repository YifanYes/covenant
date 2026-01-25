import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['@nsmr/pixelart-react', 'recharts'],
  },
};

export default nextConfig;
