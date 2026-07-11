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
  /** App-root-relative asset paths, defaulted to the stock Safe assets. */
  assets: {
    icon: string
    splash: {
      image: string
      backgroundColor: string
      imageDark: string
      backgroundColorDark: string
    }
    androidAdaptiveIcon: {
      foregroundImage: string
      backgroundImage: string
      monochromeImage: string
    }
    favicon: string
  }
  /** OTA opt-in; certificate path resolved to app-root-relative. */
  updates?: {
    codeSigningCertificatePath: string
    /** Update-server manifest URL; absent → EAS default. */
    url?: string
  }
  /** Palette overrides (dot-path keys), forwarded to the runtime via `extra.brand`. */
  theme?: BrandManifest['theme']
  /** Per-brand backend, forwarded to the runtime via `extra.brand`. */
  backend?: BrandManifest['backend']
  /** Brand-gated feature packs, forwarded to the runtime via `extra.brand`. */
  features?: BrandManifest['features']
  /** Username identity config, forwarded to the runtime via `extra.brand`. */
  identity?: BrandManifest['identity']
}

export declare function loadBrandManifest(): BrandManifest

export declare function resolveBrand(opts: { isDev: boolean }, manifest?: BrandManifest): ResolvedBrand
