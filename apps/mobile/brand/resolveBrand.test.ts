import { resolveBrand, loadBrandManifest } from './resolveBrand'
import type { BrandManifest } from './schema'

const safe: BrandManifest = {
  id: 'safe',
  name: 'Safe{Mobile}',
  devNamePrefix: 'Dev-',
  slug: 'safe-mobileapp',
  owner: 'safeglobal',
  easProjectId: '27e9e907-8675-474d-99ee-6c94e7b83a5c',
  scheme: ['wc'],
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
