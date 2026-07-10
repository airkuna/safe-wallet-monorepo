import Constants from 'expo-constants'

/**
 * Resolves the brand's primary deep-link scheme from the Expo config, where it
 * is baked from the brand manifest's `scheme` field (see `brand/resolveBrand.js`).
 * The `wc` scheme belongs to WalletConnect and is claimed by every wallet on the
 * device, so a brand-specific scheme is preferred whenever one is registered.
 */
export const getPrimaryScheme = (): string => {
  const scheme = Constants?.expoConfig?.scheme
  const schemes = Array.isArray(scheme) ? scheme : scheme ? [scheme] : []
  return schemes.find((entry) => entry !== 'wc') ?? schemes[0] ?? 'safe'
}
