import Constants from 'expo-constants'

/**
 * Resolves the deep-link scheme for payment links from the Expo config, where
 * it is baked from the brand manifest's `scheme` field (see `brand/resolveBrand.js`).
 * The `wc` scheme belongs to WalletConnect and is claimed by every wallet on the
 * device, so a brand-specific scheme is preferred whenever one is registered.
 */
export const getPaymentLinkScheme = (): string => {
  const scheme = Constants?.expoConfig?.scheme
  const schemes = Array.isArray(scheme) ? scheme : scheme ? [scheme] : []
  return schemes.find((entry) => entry !== 'wc') ?? schemes[0] ?? 'safe'
}

/**
 * Wraps an EIP-681 URI in a shareable deep link (`<scheme>://pay?uri=...`) that
 * opens the `pay` route when the recipient has the branded app installed.
 * An https universal link with a web fallback is post-MVP (needs per-brand hosting).
 */
export const buildPaymentLink = (eip681Uri: string): string => {
  return `${getPaymentLinkScheme()}://pay?uri=${encodeURIComponent(eip681Uri)}`
}
