import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The dev server refuses to serve /_next/* resources to origins it does not recognise,
  // which silently disables client-side hydration: the page renders (SSR) but no handler is
  // attached, so forms fall back to a native submit and login just "refreshes". localhost is
  // allowed by default; any other origin used to reach the dev server — a LAN IP, so a phone
  // can test — must be listed here. Development only; it has no effect on a production build.
  allowedDevOrigins: ['192.168.10.135'],
}

export default nextConfig
