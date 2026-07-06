import { getBrand } from './getBrand'
import type { RuntimeBrand } from './types'

/**
 * React accessor for the active brand. The brand is baked into the binary, so
 * this never changes at runtime — it exists so components read branding the
 * idiomatic way and stay decoupled from `expo-constants`.
 */
export const useBrand = (): RuntimeBrand => getBrand()
