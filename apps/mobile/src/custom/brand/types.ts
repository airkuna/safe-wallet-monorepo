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
    /** Gateway for production builds only; dev builds stay on staging. */
    cgwBaseUrl?: string
    /** Gateway for development builds; defaults to the Safe staging gateway. */
    cgwStagingBaseUrl?: string
    /** Chain preselected when creating a new account (must exist on the gateway). */
    defaultChainId?: string
    /** host → SPKI base64 pins; consumed at config time, carried for completeness. */
    pinnedCertificates?: Record<string, string[]>
  }
}
