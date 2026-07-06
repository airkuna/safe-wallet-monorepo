import type { ZodType } from 'zod'

/**
 * The validated shape of a brand manifest. Identity fields are baked into the
 * binary at build time; `backend`/`theme` are consumed by later phases.
 */
export interface BrandManifest {
  /** Stable brand key, also the manifest file name (`brand/manifests/<id>.json`). */
  id: string
  /** Display name on the installer/home screen for the production variant. */
  name: string
  /** Prefix applied to `name` for the development variant. Defaults to `Dev-`. */
  devNamePrefix?: string
  /** Expo slug. */
  slug: string
  /** EAS account owner. */
  owner: string
  /** EAS project id (per brand). */
  easProjectId: string
  /** Deep-link scheme(s). */
  scheme: string | [string, ...string[]]
  ios: {
    /** Production base bundle identifier; the dev variant appends `.dev`. */
    bundleIdentifier: string
    appleTeamId: string
  }
  android: {
    /** Production base application id; the dev variant appends `.dev`. */
    package: string
  }
  /** Optional per-brand backend. */
  backend?: {
    cgwBaseUrl?: string
    /** Chain preselected when creating a new account (must exist on the gateway). */
    defaultChainId?: string
  }
  /**
   * Optional palette overrides applied on top of the shared theme.
   * Keys are dot-paths into the palette (e.g. `"primary.main"`).
   */
  theme?: {
    light?: Record<string, string>
    dark?: Record<string, string>
  }
  /**
   * Optional visual assets. Image paths are relative to `brand/`
   * (e.g. `assets/acme/icon.png`); `backgroundColor*` are hex colors.
   * Missing fields fall back to the stock Safe assets.
   */
  assets?: {
    icon?: string
    splash?: {
      image?: string
      backgroundColor?: string
      imageDark?: string
      backgroundColorDark?: string
    }
    androidAdaptiveIcon?: {
      foregroundImage?: string
      backgroundImage?: string
      monochromeImage?: string
    }
    favicon?: string
  }
}

export declare const brandManifestSchema: ZodType<BrandManifest>
