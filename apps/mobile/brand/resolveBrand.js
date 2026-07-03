const { readFileSync } = require('fs')
const { resolve } = require('path')
const { brandManifestSchema } = require('./schema')

/**
 * Resolve a brand manifest into the fully-computed identity for one variant.
 * All variant math (the `.dev` suffix, iOS app-group id, APNs mode) lives here
 * so `app.config.ts` only consumes final strings. See `brand/README.md`.
 *
 * CommonJS on purpose — required at Expo config-eval time; types in
 * `resolveBrand.d.ts`.
 */

const DEV_SUFFIX = '.dev'
const DEFAULT_DEV_NAME_PREFIX = 'Dev-'

const withVariant = (base, isDev) => (isDev ? `${base}${DEV_SUFFIX}` : base)

const manifestPath = (id) => resolve(process.cwd(), 'brand/manifests', `${id}.json`)

/**
 * Load the active manifest. Precedence:
 *   1. `BRAND_CONFIG_JSON` — inline JSON (used by the SaaS build pipeline).
 *   2. `brand/manifests/${BRAND_ID}.json` — local file (BRAND_ID defaults to `safe`).
 */
const loadBrandManifest = () => {
  const inline = process.env.BRAND_CONFIG_JSON
  const raw = inline
    ? JSON.parse(inline)
    : JSON.parse(readFileSync(manifestPath(process.env.BRAND_ID ?? 'safe'), 'utf-8'))
  return brandManifestSchema.parse(raw)
}

const resolveBrand = ({ isDev }, manifest = loadBrandManifest()) => {
  const bundleIdentifier = withVariant(manifest.ios.bundleIdentifier, isDev)
  const devNamePrefix = manifest.devNamePrefix ?? DEFAULT_DEV_NAME_PREFIX

  return {
    id: manifest.id,
    appName: isDev ? `${devNamePrefix}${manifest.name}` : manifest.name,
    slug: manifest.slug,
    owner: manifest.owner,
    easProjectId: manifest.easProjectId,
    scheme: manifest.scheme,
    ios: {
      bundleIdentifier,
      appleTeamId: manifest.ios.appleTeamId,
      appGroupIdentifier: `group.${bundleIdentifier}`,
      apsEnvMode: isDev ? 'development' : 'production',
    },
    android: {
      package: withVariant(manifest.android.package, isDev),
    },
  }
}

module.exports = { resolveBrand, loadBrandManifest }
