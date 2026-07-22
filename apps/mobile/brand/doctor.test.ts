import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { diagnose, report, firebaseFileNames } from './doctor'
import type { BrandManifest } from './schema'

const acme: BrandManifest = {
  id: 'acme',
  name: 'Acme Wallet',
  slug: 'acme',
  owner: 'acme',
  easProjectId: 'a3bfe1f6-16bd-4b0c-a171-86410842cbaf',
  scheme: ['acme', 'wc'],
  ios: { bundleIdentifier: 'com.acme.wallet', appleTeamId: 'TEAM123456' },
  android: { package: 'com.acme.wallet' },
  assets: {
    icon: 'assets/acme/icon.png',
    splash: {
      image: 'assets/acme/splash.png',
      backgroundColor: '#FFFFFF',
      imageDark: 'assets/acme/splash.png',
      backgroundColorDark: '#000000',
    },
    androidAdaptiveIcon: {
      foregroundImage: 'assets/acme/adaptive-fg.png',
      backgroundImage: 'assets/acme/adaptive-bg.png',
      monochromeImage: 'assets/acme/adaptive-mono.png',
    },
    favicon: 'assets/acme/favicon.png',
  },
}

const googleServices = (packageName: string) =>
  JSON.stringify({ client: [{ client_info: { android_client_info: { package_name: packageName } } }] })

const googlePlist = (bundleId: string) =>
  `<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict><key>BUNDLE_ID</key>\n<string>${bundleId}</string></dict></plist>`

const easJson = (brandId: string) =>
  JSON.stringify({
    build: {
      [`preview-${brandId}`]: { env: { BRAND_ID: brandId } },
      [`production-${brandId}`]: { env: { BRAND_ID: brandId } },
    },
  })

const write = (root: string, relativePath: string, contents: string) => {
  const filePath = join(root, relativePath)
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, contents)
}

/** A complete brand package in a temp app dir; tests then poke holes in it. */
const createFixture = (manifest: BrandManifest = acme) => {
  const appDir = mkdtempSync(join(tmpdir(), 'brand-doctor-'))
  const files = firebaseFileNames(manifest.id)

  write(appDir, `brand/manifests/${manifest.id}.json`, JSON.stringify(manifest))
  for (const asset of [
    'assets/acme/icon.png',
    'assets/acme/splash.png',
    'assets/acme/adaptive-fg.png',
    'assets/acme/adaptive-bg.png',
    'assets/acme/adaptive-mono.png',
    'assets/acme/favicon.png',
  ]) {
    write(appDir, `brand/${asset}`, 'png')
  }
  write(appDir, files.androidProd, googleServices(manifest.android.package))
  write(appDir, files.androidDev, googleServices(`${manifest.android.package}.dev`))
  write(appDir, files.iosProd, googlePlist(manifest.ios.bundleIdentifier))
  write(appDir, files.iosDev, googlePlist(`${manifest.ios.bundleIdentifier}.dev`))
  write(appDir, 'eas.json', easJson(manifest.id))

  return appDir
}

const levelOf = (result: ReturnType<typeof diagnose>, id: string) =>
  result.checks.find((check) => check.id === id)?.level

describe('brand doctor', () => {
  const fixtures: string[] = []
  const fixture = (manifest?: BrandManifest) => {
    const appDir = createFixture(manifest)
    fixtures.push(appDir)
    return appDir
  }

  afterAll(() => {
    for (const appDir of fixtures) {
      rmSync(appDir, { recursive: true, force: true })
    }
  })

  it('passes a complete brand package with no errors or warnings', () => {
    const result = diagnose('acme', { appDir: fixture(), env: {} })

    expect(result.ok).toBe(true)
    expect(result.checks.every((check) => check.level === 'ok')).toBe(true)
  })

  it('reports a missing production google-services file as an error', () => {
    const appDir = fixture()
    rmSync(join(appDir, 'google-services-acme.json'))

    const result = diagnose('acme', { appDir, env: {} })

    expect(result.ok).toBe(false)
    expect(levelOf(result, 'firebase:android:prod')).toBe('error')
  })

  it('downgrades missing Firebase files to warnings with allowRemoteFirebase', () => {
    const appDir = fixture()
    rmSync(join(appDir, 'google-services-acme.json'))

    const result = diagnose('acme', { appDir, env: {}, allowRemoteFirebase: true })

    expect(result.ok).toBe(true)
    expect(levelOf(result, 'firebase:android:prod')).toBe('warn')
  })

  it('treats a missing dev-variant Firebase file as a warning only', () => {
    const appDir = fixture()
    rmSync(join(appDir, 'google-services-acme-dev.json'))

    const result = diagnose('acme', { appDir, env: {} })

    expect(result.ok).toBe(true)
    expect(levelOf(result, 'firebase:android:dev')).toBe('warn')
  })

  it('rejects a google-services file whose package does not match the manifest', () => {
    const appDir = fixture()
    write(appDir, 'google-services-acme.json', googleServices('com.other.app'))

    const result = diagnose('acme', { appDir, env: {} })

    expect(result.ok).toBe(false)
    expect(levelOf(result, 'firebase:android:prod')).toBe('error')
    expect(result.checks.find((check) => check.id === 'firebase:android:prod')?.message).toContain('com.acme.wallet')
  })

  it('rejects a plist whose BUNDLE_ID does not match the manifest', () => {
    const appDir = fixture()
    write(appDir, 'GoogleService-Info-acme.plist', googlePlist('com.other.app'))

    const result = diagnose('acme', { appDir, env: {} })

    expect(result.ok).toBe(false)
    expect(levelOf(result, 'firebase:ios:prod')).toBe('error')
  })

  it('honours GOOGLE_SERVICES_* env overrides like the Expo config does', () => {
    const appDir = fixture()
    write(appDir, 'custom-location.json', googleServices(acme.android.package))
    rmSync(join(appDir, 'google-services-acme.json'))

    const result = diagnose('acme', { appDir, env: { GOOGLE_SERVICES_JSON: './custom-location.json' } })

    expect(levelOf(result, 'firebase:android:prod')).toBe('ok')
  })

  it('reports a missing referenced asset as an error', () => {
    const appDir = fixture()
    rmSync(join(appDir, 'brand/assets/acme/icon.png'))

    const result = diagnose('acme', { appDir, env: {} })

    expect(result.ok).toBe(false)
    expect(levelOf(result, 'assets:icon')).toBe('error')
  })

  it('treats a missing favicon as a warning (web preview target only)', () => {
    const appDir = fixture()
    rmSync(join(appDir, 'brand/assets/acme/favicon.png'))

    const result = diagnose('acme', { appDir, env: {} })

    expect(result.ok).toBe(true)
    expect(levelOf(result, 'assets:favicon')).toBe('warn')
  })

  it('fails fast with schema violations for an invalid manifest', () => {
    const appDir = fixture()
    write(appDir, 'brand/manifests/acme.json', JSON.stringify({ ...acme, easProjectId: 'not-a-uuid' }))

    const result = diagnose('acme', { appDir, env: {} })

    expect(result.ok).toBe(false)
    expect(result.checks).toHaveLength(1)
    expect(result.checks[0]).toMatchObject({ id: 'manifest', level: 'error' })
    expect(result.checks[0].message).toContain('easProjectId')
  })

  it('fails when the manifest file does not exist', () => {
    const result = diagnose('ghost', { appDir: fixture(), env: {} })

    expect(result.ok).toBe(false)
    expect(levelOf(result, 'manifest')).toBe('error')
  })

  it('warns when eas.json lacks the brand build profiles', () => {
    const appDir = fixture()
    write(appDir, 'eas.json', JSON.stringify({ build: {} }))

    const result = diagnose('acme', { appDir, env: {} })

    expect(result.ok).toBe(true)
    expect(levelOf(result, 'eas:profiles')).toBe('warn')
  })

  it('validates the OTA code-signing certificate when the brand opts in', () => {
    const appDir = fixture({ ...acme, updates: { codeSigningCertificatePath: 'certs/acme/certificate.pem' } })

    const missing = diagnose('acme', { appDir, env: {} })
    expect(missing.ok).toBe(false)
    expect(levelOf(missing, 'ota:certificate')).toBe('error')

    write(appDir, 'brand/certs/acme/certificate.pem', 'cert')
    const present = diagnose('acme', { appDir, env: {} })
    expect(levelOf(present, 'ota:certificate')).toBe('ok')
  })

  it('rejects an identity registration proxy that is not https', () => {
    const appDir = fixture({
      ...acme,
      identity: { parentDomain: 'acme.eth', registrationProxyUrl: 'http://proxy.acme.dev' },
    })

    const result = diagnose('acme', { appDir, env: {} })

    expect(result.ok).toBe(false)
    expect(levelOf(result, 'identity')).toBe('error')
  })

  it('accepts a resolvable https identity config', () => {
    const appDir = fixture({
      ...acme,
      identity: { parentDomain: 'acme.eth', registrationProxyUrl: 'https://proxy.acme.dev' },
    })

    const result = diagnose('acme', { appDir, env: {} })

    expect(levelOf(result, 'identity')).toBe('ok')
  })

  it('uses the stock file names for the safe brand', () => {
    expect(firebaseFileNames('safe')).toEqual({
      androidProd: 'google-services.json',
      androidDev: 'google-services-dev.json',
      iosProd: 'GoogleService-Info.plist',
      iosDev: 'GoogleService-Info-Dev.plist',
    })
    expect(firebaseFileNames('airkuna').androidProd).toBe('google-services-airkuna.json')
  })

  it('renders a human report with a final verdict line', () => {
    const appDir = fixture()
    const passing = report('acme', diagnose('acme', { appDir, env: {} }))
    expect(passing).toContain('brand doctor — acme')
    expect(passing).toContain('PASS')

    rmSync(join(appDir, 'google-services-acme.json'))
    const failing = report('acme', diagnose('acme', { appDir, env: {} }))
    expect(failing).toContain('FAIL')
    expect(failing).toContain('google-services-acme.json missing')
  })
})
