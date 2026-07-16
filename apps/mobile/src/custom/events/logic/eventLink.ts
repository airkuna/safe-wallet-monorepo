import { getPrimaryScheme } from '@/src/custom/brand'

/**
 * Share link eventa: deep link na event u appu (`<scheme>://events/event?event=<slug>`)
 * — expo-router mapira path izravno na postojeću rutu `app/events/event.tsx`.
 * Isti obrazac kao payment linkovi (custom/paymentLinks/buildPaymentLink.ts);
 * https universal link s web fallbackom je post-MVP (traži per-brand hosting).
 */
export const buildEventLink = (slug: string): string => {
  return `${getPrimaryScheme()}://events/event?event=${encodeURIComponent(slug)}`
}
