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
    /** Gateway for production builds only; dev builds stay on staging. */
    cgwBaseUrl?: string
    /** Gateway for development builds; defaults to the Safe staging gateway. */
    cgwStagingBaseUrl?: string
    /** Chain preselected when creating a new account (must exist on the gateway). */
    defaultChainId?: string
    /** host → SPKI base64 pins, merged into the app's SSL pinning config. */
    pinnedCertificates?: Record<string, string[]>
  }
  /**
   * Optional palette overrides applied on top of the shared theme.
   * Keys are dot-paths into the palette (e.g. `"primary.main"`).
   */
  theme?: {
    light?: Record<string, string>
    dark?: Record<string, string>
  }
  /** Brand-gated feature packs (e.g. `ff`); absent flags are off. */
  features?: Record<string, boolean>
  /**
   * Username identity via ENS offchain subnames. Absent → identity UI never
   * mounts. The Namestone API key lives behind `registrationProxyUrl`, never
   * in the manifest or the binary.
   */
  identity?: {
    /** ENS parent domain users get subnames under (e.g. `kuna.eth`). */
    parentDomain: string
    /** Proxy holding the registration API key (Cloudflare Worker or similar). */
    registrationProxyUrl: string
    /** Chain the ENS registry lives on; resolution happens here. Default `1`. */
    resolverChainId?: string
    /** Names users cannot claim (brand, admin, support, ...). */
    reservedNames?: string[]
  }
  /**
   * Events (Događaji) backend for the `events` feature pack — the Supabase
   * edge functions base URL (e.g. `https://api.domovina.ai/functions/v1`).
   * Absent → the catalog stays config-only and orders live on-device only.
   */
  events?: {
    apiBaseUrl: string
  }
  /**
   * Opting in enables OTA (EAS Update) for this brand. The certificate path is
   * relative to `brand/` (e.g. `certs/acme/certificate.pem`); the matching
   * private key stays outside the repo (see `keys/` in .gitignore).
   */
  updates?: {
    codeSigningCertificatePath: string
    /** Update-server manifest URL; defaults to EAS (`https://u.expo.dev/<easProjectId>`). */
    url?: string
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
