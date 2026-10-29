import { defineCloudflareConfig } from '@opennextjs/cloudflare'

// Required for every OpenNext Cloudflare build: `opennextjs-cloudflare build` refuses to run
// without this file (Cloudflare's Git builder invokes that command for Next.js projects).
//
// The default template wires up an R2 bucket as the incremental cache. This app is fully
// dynamic — every page reads live budget rows behind an auth cookie — so an ISR cache would
// only add an R2 bucket to provision and a stale-data risk. With no `incrementalCache` the
// adapter falls back to its no-op cache, which is the supported configuration for this case.
// See https://opennext.js.org/cloudflare/caching if caching is ever wanted.
export default defineCloudflareConfig({})
