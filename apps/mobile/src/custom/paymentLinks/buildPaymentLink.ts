import { getPrimaryScheme } from '@/src/custom/brand'

/**
 * Wraps an EIP-681 URI in a shareable deep link (`<scheme>://pay?uri=...`) that
 * opens the `pay` route when the recipient has the branded app installed.
 * An https universal link with a web fallback is post-MVP (needs per-brand hosting).
 */
export const buildPaymentLink = (eip681Uri: string): string => {
  return `${getPrimaryScheme()}://pay?uri=${encodeURIComponent(eip681Uri)}`
}
