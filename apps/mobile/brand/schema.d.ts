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
  /** Optional per-brand backend (phase 2). */
  backend?: {
    cgwBaseUrl?: string
  }
  /** Optional palette overrides applied on top of the shared theme (phase 2). */
  theme?: {
    light?: Record<string, string>
    dark?: Record<string, string>
  }
}

export declare const brandManifestSchema: ZodType<BrandManifest>
