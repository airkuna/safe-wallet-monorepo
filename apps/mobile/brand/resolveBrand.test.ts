import { resolveBrand, loadBrandManifest } from './resolveBrand'
import type { BrandManifest } from './schema'

const safe: BrandManifest = {
  id: 'safe',
  name: 'Safe{Mobile}',
  devNamePrefix: 'Dev-',
  slug: 'safe-mobileapp',
  owner: 'safeglobal',
  easProjectId: '27e9e907-8675-474d-99ee-6c94e7b83a5c',
  scheme: ['safe', 'wc'],
  ios: { bundleIdentifier: 'global.safe.mobileapp.ios', appleTeamId: '86487MHG6V' },
  android: { package: 'global.safe.mobileapp' },
}

describe('resolveBrand', () => {
  it('reproduces the production identity', () => {
    const brand = resolveBrand({ isDev: false }, safe)

    expect(brand.appName).toBe('Safe{Mobile}')
    expect(brand.android.package).toBe('global.safe.mobileapp')
    expect(brand.ios.bundleIdentifier).toBe('global.safe.mobileapp.ios')
    expect(brand.ios.appGroupIdentifier).toBe('group.global.safe.mobileapp.ios')
    expect(brand.ios.apsEnvMode).toBe('production')
  })

  it('reproduces the development identity', () => {
    const brand = resolveBrand({ isDev: true }, safe)

    expect(brand.appName).toBe('Dev-Safe{Mobile}')
    expect(brand.android.package).toBe('global.safe.mobileapp.dev')
    expect(brand.ios.bundleIdentifier).toBe('global.safe.mobileapp.ios.dev')
    expect(brand.ios.appGroupIdentifier).toBe('group.global.safe.mobileapp.ios.dev')
    expect(brand.ios.apsEnvMode).toBe('development')
  })

  it('carries EAS identity through unchanged', () => {
    const brand = resolveBrand({ isDev: false }, safe)

    expect(brand.owner).toBe('safeglobal')
    expect(brand.easProjectId).toBe('27e9e907-8675-474d-99ee-6c94e7b83a5c')
    expect(brand.slug).toBe('safe-mobileapp')
  })

  it('defaults assets to the stock Safe assets when the manifest has none', () => {
    const brand = resolveBrand({ isDev: false }, safe)

    expect(brand.assets).toEqual({
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
    })
  })

  it('resolves manifest asset paths relative to brand/ and keeps colors as-is', () => {
    const brand = resolveBrand(
      { isDev: false },
      {
        ...safe,
        assets: {
          icon: 'assets/acme/icon.png',
          splash: { image: 'assets/acme/splash.png', backgroundColor: '#123456' },
          androidAdaptiveIcon: { foregroundImage: 'assets/acme/adaptive-fg.png' },
        },
      },
    )

    expect(brand.assets.icon).toBe('./brand/assets/acme/icon.png')
    expect(brand.assets.splash.image).toBe('./brand/assets/acme/splash.png')
    expect(brand.assets.splash.backgroundColor).toBe('#123456')
    // omitted fields fall back to the stock Safe assets
    expect(brand.assets.splash.imageDark).toBe('./assets/images/icon-light.png')
    expect(brand.assets.androidAdaptiveIcon.foregroundImage).toBe('./brand/assets/acme/adaptive-fg.png')
    expect(brand.assets.androidAdaptiveIcon.backgroundImage).toBe(
      './assets/images/android-adaptive-icon-background.png',
    )
    expect(brand.assets.favicon).toBe('./assets/images/favicon.png')
  })

  it('passes theme and backend through for the runtime layer', () => {
    const theme = { light: { 'primary.main': '#0A84FF' }, dark: { 'primary.main': '#FF9F0A' } }
    const backend = { cgwBaseUrl: 'https://cgw.example.com', defaultChainId: '100' }

    const brand = resolveBrand({ isDev: false }, { ...safe, theme, backend })

    expect(brand.theme).toEqual(theme)
    expect(brand.backend).toEqual(backend)
  })

  it('leaves theme and backend undefined when the manifest has none', () => {
    const brand = resolveBrand({ isDev: false }, safe)

    expect(brand.theme).toBeUndefined()
    expect(brand.backend).toBeUndefined()
  })

  it('resolves the OTA code-signing certificate path relative to brand/', () => {
    const brand = resolveBrand(
      { isDev: false },
      { ...safe, updates: { codeSigningCertificatePath: 'certs/acme/certificate.pem' } },
    )

    expect(brand.updates).toEqual({
      codeSigningCertificatePath: './brand/certs/acme/certificate.pem',
      url: undefined,
    })
  })

  it('passes a custom update-server url through unchanged', () => {
    const brand = resolveBrand(
      { isDev: false },
      {
        ...safe,
        updates: {
          codeSigningCertificatePath: 'certs/acme/certificate.pem',
          url: 'https://ota.example.com/api/manifest',
        },
      },
    )

    expect(brand.updates?.url).toBe('https://ota.example.com/api/manifest')
  })

  it('leaves updates undefined when the manifest does not opt in (OTA disabled)', () => {
    const brand = resolveBrand({ isDev: false }, safe)

    expect(brand.updates).toBeUndefined()
  })

  it('prefers an inline BRAND_CONFIG_JSON over the file', () => {
    const original = process.env.BRAND_CONFIG_JSON
    process.env.BRAND_CONFIG_JSON = JSON.stringify({ ...safe, id: 'inline', name: 'Inline Wallet' })

    try {
      expect(loadBrandManifest().id).toBe('inline')
    } finally {
      if (original === undefined) {
        delete process.env.BRAND_CONFIG_JSON
      } else {
        process.env.BRAND_CONFIG_JSON = original
      }
    }
  })

  it('loads the default safe manifest from disk', () => {
    expect(loadBrandManifest().id).toBe('safe')
  })

  it('rejects a manifest with a malformed EAS project id', () => {
    process.env.BRAND_CONFIG_JSON = JSON.stringify({ ...safe, easProjectId: 'not-a-uuid' })

    try {
      expect(() => loadBrandManifest()).toThrow()
    } finally {
      delete process.env.BRAND_CONFIG_JSON
    }
  })
})
