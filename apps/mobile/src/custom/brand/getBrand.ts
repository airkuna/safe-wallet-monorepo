import Constants from 'expo-constants'
import type { RuntimeBrand } from './types'

/**
 * Stock Safe identity — used when no brand payload is present (plain checkout,
 * tests, Storybook), so the default build behaves exactly like upstream.
 */
const FALLBACK_BRAND: RuntimeBrand = {
  id: 'safe',
  name: 'Safe{Mobile}',
}

/**
 * The active brand, resolved from the Expo config. Static for the lifetime of
 * the binary — safe to call at module-eval time (e.g. theme token generation).
 */
export const getBrand = (): RuntimeBrand => {
  const brand = Constants?.expoConfig?.extra?.brand as RuntimeBrand | undefined
  return brand ?? FALLBACK_BRAND
}
