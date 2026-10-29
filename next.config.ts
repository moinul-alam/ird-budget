import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The dev server refuses to serve /_next/* resources to origins it does not recognise,
  // which silently disables client-side hydration: the page renders (SSR) but no handler is
  // attached, so forms fall back to a native submit and login just "refreshes". localhost is
  // allowed by default; any other origin used to reach the dev server — a LAN IP, so a phone
  // can test — must be listed here. Development only; it has no effect on a production build.
  allowedDevOrigins: ['192.168.10.135'],
  // Packages that ship `workerd`-specific code behind conditional exports. Keeping them out of
  // the webpack server bundle makes Next trace the *whole* package (every conditional entrypoint)
  // instead of only the Node/default one. Without this, `pg-cloudflare` is traced as just
  // `dist/empty.js`, and the Cloudflare build then dies in esbuild with:
  //   X [ERROR] Could not resolve "pg-cloudflare" ... "./dist/index.js" was not found
  // because OpenNext resolves the server bundle with the `workerd` condition.
  // See https://opennext.js.org/cloudflare/howtos/workerd
  serverExternalPackages: ['@prisma/client', '.prisma/client', 'pg', 'pg-cloudflare'],
}

export default nextConfig
