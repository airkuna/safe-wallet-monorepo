const { z } = require('zod')

/**
 * A brand manifest is the single source of truth for one white-label build.
 * In local dev it is a JSON file under `brand/manifests/`; in the SaaS build
 * pipeline the same JSON is injected via the `BRAND_CONFIG_JSON` env var,
 * validated against this schema on both the dashboard and the app side.
 *
 * This module is CommonJS `.js` (not `.ts`) on purpose: Expo's config loader
 * transpiles only `app.config.ts` itself and then `require`s siblings through
 * plain Node resolution, which does not resolve `.ts`. Types live in
 * `schema.d.ts`.
 */
const brandManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  devNamePrefix: z.string().min(1).optional(),
  slug: z.string().min(1),
  owner: z.string().min(1),
  easProjectId: z.string().uuid(),
  scheme: z.union([z.string().min(1), z.array(z.string().min(1)).nonempty()]),
  ios: z.object({
    bundleIdentifier: z.string().min(1),
    appleTeamId: z.string().min(1),
  }),
  android: z.object({
    package: z.string().min(1),
  }),
  backend: z
    .object({
      cgwBaseUrl: z.string().url().optional(),
      cgwStagingBaseUrl: z.string().url().optional(),
      defaultChainId: z.string().min(1).optional(),
      // host → SPKI base64 pins, merged into the app's SSL pinning config.
      pinnedCertificates: z.record(z.array(z.string().min(1)).min(1)).optional(),
    })
    .optional(),
  theme: z
    .object({
      light: z.record(z.string()).optional(),
      dark: z.record(z.string()).optional(),
    })
    .optional(),
  // Brand-gated feature packs (e.g. `ff` for the FootballFans club layer);
  // absent flags are off, so stock brands never mount custom surfaces.
  features: z.record(z.boolean()).optional(),
  // Username identity via ENS offchain subnames (faza 4). Absent → identity UI
  // never mounts; the registration API key lives behind the proxy, never here.
  identity: z
    .object({
      // ENS parent domain users get subnames under (e.g. `kuna.eth`).
      parentDomain: z.string().min(1),
      // Cloudflare Worker (or equivalent) holding the Namestone API key.
      registrationProxyUrl: z.string().url(),
      // Chain the ENS registry lives on; resolution happens here (default `1`).
      resolverChainId: z.string().min(1).optional(),
      // Names users cannot claim (brand, admin, support, ...).
      reservedNames: z.array(z.string().min(1)).optional(),
    })
    .optional(),
  // Događaji (E2): backend za events pack — Supabase edge functions base
  // (npr. `https://api.domovina.ai/functions/v1`). Absent → katalog ostaje
  // config-only i narudžbe žive samo lokalno (E1 ponašanje).
  events: z
    .object({
      apiBaseUrl: z.string().url(),
    })
    .optional(),
  // Donacije (airKUNA A1/A2): backend za donations pack — Supabase edge
  // functions base (npr. `https://api.domovina.ai/functions/v1`). Absent →
  // donations UI se nikad ne mounta.
  donations: z
    .object({
      apiBaseUrl: z.string().url(),
    })
    .optional(),
  updates: z
    .object({
      codeSigningCertificatePath: z.string().min(1),
      url: z.string().url().optional(),
    })
    .optional(),
  assets: z
    .object({
      icon: z.string().min(1).optional(),
      splash: z
        .object({
          image: z.string().min(1).optional(),
          backgroundColor: z.string().min(1).optional(),
          imageDark: z.string().min(1).optional(),
          backgroundColorDark: z.string().min(1).optional(),
        })
        .optional(),
      androidAdaptiveIcon: z
        .object({
          foregroundImage: z.string().min(1).optional(),
          backgroundImage: z.string().min(1).optional(),
          monochromeImage: z.string().min(1).optional(),
        })
        .optional(),
      favicon: z.string().min(1).optional(),
    })
    .optional(),
})

module.exports = { brandManifestSchema }
