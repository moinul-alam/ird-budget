import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    // Allows production builds to complete even if your project has type errors
    ignoreBuildErrors: true,
  },
}

export default nextConfig
