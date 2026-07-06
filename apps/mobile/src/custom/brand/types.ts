import type { ThemeOverride } from '@safe-global/theme/generators/tamagui'

/**
 * The runtime slice of the brand manifest, baked into the binary via
 * `expoConfig.extra.brand` (see `app.config.ts` and `brand/README.md`).
 */
export interface RuntimeBrand {
  id: string
  name: string
  /** Palette overrides (dot-path keys) applied on top of the shared theme. */
  theme?: ThemeOverride
  backend?: {
    cgwBaseUrl?: string
  }
}
