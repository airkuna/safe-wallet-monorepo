import type { BrandManifest } from './schema'

/**
 * Fully-computed identity for a single variant (dev or prod), ready to be
 * spread into the Expo config.
 */
export interface ResolvedBrand {
  id: string
  appName: string
  slug: string
  owner: string
  easProjectId: string
  scheme: string | [string, ...string[]]
  ios: {
    bundleIdentifier: string
    appleTeamId: string
    appGroupIdentifier: string
    apsEnvMode: 'development' | 'production'
  }
  android: {
    package: string
  }
}

export declare function loadBrandManifest(): BrandManifest

export declare function resolveBrand(opts: { isDev: boolean }, manifest?: BrandManifest): ResolvedBrand
