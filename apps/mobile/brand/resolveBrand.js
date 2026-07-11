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

// Stock Safe assets — the fallback whenever a manifest omits an asset, so the
// default `safe` brand stays byte-identical to the pre-brand config.
const SAFE_DEFAULT_ASSETS = {
  icon: './assets/images/icon.png',
  splash: {
    image: './assets/images/icon-dark.png',
    backgroundColor: '#f4f4f4',
    imageDark: './assets/images/icon-light.png',
    backgroundColorDark: '#121312',
  },
  androidAdaptiveIcon: {
    foregroundImage: './assets/images/android-adaptive-icon-foreground.png',
    backgroundImage: './assets/images/android-adaptive-icon-background.png',
    monochromeImage: './assets/images/android-adaptive-icon-monochrome.png',
  },
  favicon: './assets/images/favicon.png',
}

const withVariant = (base, isDev) => (isDev ? `${base}${DEV_SUFFIX}` : base)

// Manifest asset paths are relative to `brand/`; the Expo config expects
// app-root-relative paths.
const brandAssetPath = (path) => (path === undefined ? undefined : `./brand/${path}`)

const resolveAssets = (assets = {}) => ({
  icon: brandAssetPath(assets.icon) ?? SAFE_DEFAULT_ASSETS.icon,
  splash: {
    image: brandAssetPath(assets.splash?.image) ?? SAFE_DEFAULT_ASSETS.splash.image,
    backgroundColor: assets.splash?.backgroundColor ?? SAFE_DEFAULT_ASSETS.splash.backgroundColor,
    imageDark: brandAssetPath(assets.splash?.imageDark) ?? SAFE_DEFAULT_ASSETS.splash.imageDark,
    backgroundColorDark: assets.splash?.backgroundColorDark ?? SAFE_DEFAULT_ASSETS.splash.backgroundColorDark,
  },
  androidAdaptiveIcon: {
    foregroundImage:
      brandAssetPath(assets.androidAdaptiveIcon?.foregroundImage) ??
      SAFE_DEFAULT_ASSETS.androidAdaptiveIcon.foregroundImage,
    backgroundImage:
      brandAssetPath(assets.androidAdaptiveIcon?.backgroundImage) ??
      SAFE_DEFAULT_ASSETS.androidAdaptiveIcon.backgroundImage,
    monochromeImage:
      brandAssetPath(assets.androidAdaptiveIcon?.monochromeImage) ??
      SAFE_DEFAULT_ASSETS.androidAdaptiveIcon.monochromeImage,
  },
  favicon: brandAssetPath(assets.favicon) ?? SAFE_DEFAULT_ASSETS.favicon,
})

// Anchored to this file, not process.cwd(): the Expo config gets evaluated
// from other working directories too (monorepo root, ios/android build phases).
const manifestPath = (id) => resolve(__dirname, 'manifests', `${id}.json`)

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
    assets: resolveAssets(manifest.assets),
    // OTA (EAS Update) is opt-in per brand; absent → expo-updates stays disabled.
    updates: manifest.updates
      ? {
          codeSigningCertificatePath: brandAssetPath(manifest.updates.codeSigningCertificatePath),
          url: manifest.updates.url,
        }
      : undefined,
    // Runtime branding, forwarded to the app via `expoConfig.extra.brand`.
    theme: manifest.theme,
    backend: manifest.backend,
    features: manifest.features,
    identity: manifest.identity,
  }
}

module.exports = { resolveBrand, loadBrandManifest }
