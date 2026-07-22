const { existsSync, readFileSync } = require('fs')
const { resolve, join } = require('path')
const { brandManifestSchema } = require('./schema')
const { resolveBrand } = require('./resolveBrand')

/**
 * `brand doctor` — validates that a brand package is complete enough to build:
 * manifest passes the zod schema, referenced assets exist, Firebase files are
 * present and match the manifest's application ids, and the eas.json build
 * profiles for the brand are wired. Pure reporting — never mutates anything.
 *
 * CommonJS on purpose (same seam as `resolveBrand.js`): runnable with plain
 * `node` and requirable at Expo config-eval time. Types in `doctor.d.ts`.
 *
 * CLI: `yarn workspace @safe-global/mobile brand:doctor [brandId] [--remote-firebase]`
 *   --remote-firebase: downgrade missing local Firebase files to warnings —
 *   for CI builds where they arrive as EAS file-type env vars, not from disk.
 */

const DEV_SUFFIX = '.dev'

const firebaseFileNames = (brandId) =>
  brandId === 'safe'
    ? {
        androidProd: 'google-services.json',
        androidDev: 'google-services-dev.json',
        iosProd: 'GoogleService-Info.plist',
        iosDev: 'GoogleService-Info-Dev.plist',
      }
    : {
        androidProd: `google-services-${brandId}.json`,
        androidDev: `google-services-${brandId}-dev.json`,
        iosProd: `GoogleService-Info-${brandId}.plist`,
        iosDev: `GoogleService-Info-${brandId}-Dev.plist`,
      }

const androidPackagesIn = (googleServicesJson) => {
  const clients = Array.isArray(googleServicesJson?.client) ? googleServicesJson.client : []
  return clients
    .map((client) => client?.client_info?.android_client_info?.package_name)
    .filter((name) => typeof name === 'string')
}

const bundleIdsIn = (plistContents) => {
  // GoogleService-Info.plist is a tiny fixed-format XML; a regex beats a plist dependency here.
  const match = plistContents.match(/<key>BUNDLE_ID<\/key>\s*<string>([^<]+)<\/string>/)
  return match ? [match[1]] : []
}

const checkFirebaseFile = ({ id, appDir, env, envVar, fileName, expectedId, extractIds, required, allowRemote }) => {
  const filePath = env[envVar] ? resolve(appDir, env[envVar]) : join(appDir, fileName)
  const label = env[envVar] ?? fileName

  if (!existsSync(filePath)) {
    const level = required && !allowRemote ? 'error' : 'warn'
    const hint = allowRemote && required ? ' (expected remotely via EAS file env var)' : ''
    return { id, level, message: `${label} missing — expected app id ${expectedId}${hint}` }
  }

  let ids
  try {
    ids = extractIds(readFileSync(filePath, 'utf-8'))
  } catch (error) {
    return { id, level: 'error', message: `${label} is unreadable: ${error.message}` }
  }
  if (!ids.includes(expectedId)) {
    return {
      id,
      level: 'error',
      message: `${label} does not contain app id ${expectedId} (found: ${ids.join(', ') || 'none'})`,
    }
  }
  return { id, level: 'ok', message: `${label} matches ${expectedId}` }
}

const checkAssets = (brand, appDir) => {
  const flatAssets = {
    'assets:icon': brand.assets.icon,
    'assets:splash.image': brand.assets.splash.image,
    'assets:splash.imageDark': brand.assets.splash.imageDark,
    'assets:androidAdaptiveIcon.foregroundImage': brand.assets.androidAdaptiveIcon.foregroundImage,
    'assets:androidAdaptiveIcon.backgroundImage': brand.assets.androidAdaptiveIcon.backgroundImage,
    'assets:androidAdaptiveIcon.monochromeImage': brand.assets.androidAdaptiveIcon.monochromeImage,
  }
  const checks = Object.entries(flatAssets).map(([id, assetPath]) =>
    existsSync(resolve(appDir, assetPath))
      ? { id, level: 'ok', message: `${assetPath} exists` }
      : { id, level: 'error', message: `${assetPath} not found` },
  )
  // Favicon only feeds the dev/preview web target (never store builds); the
  // stock fallback file was even deleted upstream — a miss is not a blocker.
  checks.push(
    existsSync(resolve(appDir, brand.assets.favicon))
      ? { id: 'assets:favicon', level: 'ok', message: `${brand.assets.favicon} exists` }
      : { id: 'assets:favicon', level: 'warn', message: `${brand.assets.favicon} not found (web preview target only)` },
  )
  return checks
}

const checkIdentity = (identity) => {
  if (!identity) {
    return []
  }
  const problems = []
  if (!identity.registrationProxyUrl.startsWith('https://')) {
    problems.push(`registrationProxyUrl must be https (got ${identity.registrationProxyUrl})`)
  }
  if (!identity.parentDomain.includes('.')) {
    problems.push(`parentDomain "${identity.parentDomain}" is not a resolvable domain`)
  }
  return [
    problems.length
      ? { id: 'identity', level: 'error', message: problems.join('; ') }
      : { id: 'identity', level: 'ok', message: `identity resolvable via ${identity.parentDomain}` },
  ]
}

const checkEasProfiles = (brandId, appDir) => {
  if (brandId === 'safe') {
    return []
  }
  const easJsonPath = join(appDir, 'eas.json')
  if (!existsSync(easJsonPath)) {
    return [{ id: 'eas:profiles', level: 'error', message: 'eas.json not found' }]
  }
  const easJson = JSON.parse(readFileSync(easJsonPath, 'utf-8'))
  const missing = ['preview', 'production'].filter((variant) => {
    const profile = easJson.build?.[`${variant}-${brandId}`]
    return profile?.env?.BRAND_ID !== brandId
  })
  return [
    missing.length
      ? {
          id: 'eas:profiles',
          level: 'warn',
          message: `eas.json missing brand profiles: ${missing.map((v) => `${v}-${brandId}`).join(', ')} (with env.BRAND_ID=${brandId}) — cloud builds cannot select this brand`,
        }
      : {
          id: 'eas:profiles',
          level: 'ok',
          message: `eas.json profiles preview-${brandId}/production-${brandId} wired`,
        },
  ]
}

/**
 * Run all checks for one brand. Never throws on an invalid package — every
 * problem is a returned check, so the report is always complete.
 */
const diagnose = (
  brandId,
  { appDir = resolve(__dirname, '..'), env = process.env, allowRemoteFirebase = false } = {},
) => {
  const manifestPath = join(appDir, 'brand', 'manifests', `${brandId}.json`)
  if (!existsSync(manifestPath)) {
    return { ok: false, checks: [{ id: 'manifest', level: 'error', message: `${manifestPath} not found` }] }
  }

  let raw
  try {
    raw = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  } catch (error) {
    return {
      ok: false,
      checks: [{ id: 'manifest', level: 'error', message: `manifest is not valid JSON: ${error.message}` }],
    }
  }

  const parsed = brandManifestSchema.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    return {
      ok: false,
      checks: [{ id: 'manifest', level: 'error', message: `schema violations — ${issues.join('; ')}` }],
    }
  }
  const manifest = parsed.data

  const prod = resolveBrand({ isDev: false }, manifest)
  const files = firebaseFileNames(brandId)

  const checks = [
    { id: 'manifest', level: 'ok', message: `${manifestPath} passes the brand schema` },
    ...checkAssets(prod, appDir),
    ...(prod.updates
      ? [
          existsSync(resolve(appDir, prod.updates.codeSigningCertificatePath))
            ? { id: 'ota:certificate', level: 'ok', message: `${prod.updates.codeSigningCertificatePath} exists` }
            : {
                id: 'ota:certificate',
                level: 'error',
                message: `${prod.updates.codeSigningCertificatePath} not found`,
              },
        ]
      : []),
    checkFirebaseFile({
      id: 'firebase:android:prod',
      appDir,
      env,
      envVar: 'GOOGLE_SERVICES_JSON',
      fileName: files.androidProd,
      expectedId: manifest.android.package,
      extractIds: (contents) => androidPackagesIn(JSON.parse(contents)),
      required: true,
      allowRemote: allowRemoteFirebase,
    }),
    checkFirebaseFile({
      id: 'firebase:android:dev',
      appDir,
      env,
      envVar: 'GOOGLE_SERVICES_JSON_DEV',
      fileName: files.androidDev,
      expectedId: `${manifest.android.package}${DEV_SUFFIX}`,
      extractIds: (contents) => androidPackagesIn(JSON.parse(contents)),
      required: false,
      allowRemote: allowRemoteFirebase,
    }),
    checkFirebaseFile({
      id: 'firebase:ios:prod',
      appDir,
      env,
      envVar: 'GOOGLE_SERVICES_PLIST',
      fileName: files.iosProd,
      expectedId: manifest.ios.bundleIdentifier,
      extractIds: bundleIdsIn,
      required: true,
      allowRemote: allowRemoteFirebase,
    }),
    checkFirebaseFile({
      id: 'firebase:ios:dev',
      appDir,
      env,
      envVar: 'GOOGLE_SERVICES_PLIST_DEV',
      fileName: files.iosDev,
      expectedId: `${manifest.ios.bundleIdentifier}${DEV_SUFFIX}`,
      extractIds: bundleIdsIn,
      required: false,
      allowRemote: allowRemoteFirebase,
    }),
    ...checkIdentity(manifest.identity),
    ...checkEasProfiles(brandId, appDir),
  ]

  return { ok: checks.every((check) => check.level !== 'error'), checks }
}

const MARKS = { ok: '✔', warn: '⚠', error: '✖' }

const report = (brandId, result) => {
  const lines = [`brand doctor — ${brandId}`]
  for (const check of result.checks) {
    lines.push(` ${MARKS[check.level]} ${check.id}: ${check.message}`)
  }
  const errors = result.checks.filter((check) => check.level === 'error').length
  const warnings = result.checks.filter((check) => check.level === 'warn').length
  lines.push(
    result.ok
      ? `PASS (${warnings} warning${warnings === 1 ? '' : 's'})`
      : `FAIL (${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'})`,
  )
  return lines.join('\n')
}

if (require.main === module) {
  const args = process.argv.slice(2)
  const allowRemoteFirebase = args.includes('--remote-firebase')
  const brandId = args.find((arg) => !arg.startsWith('--')) ?? process.env.BRAND_ID ?? 'safe'

  const result = diagnose(brandId, { allowRemoteFirebase })
  console.log(report(brandId, result))
  process.exitCode = result.ok ? 0 : 1
}

module.exports = { diagnose, report, firebaseFileNames }
