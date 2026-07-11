import type { MerchantBrand } from '../catalog/types'

/**
 * Runtime boje trgovca — namjerno ograničene na Tržnica ekrane (headeri, CTA).
 * Tamagui config je statičan na module-eval pa se per-merchant boje NE
 * injektiraju u tokene nego se koriste točkasto (ista lekcija kao FF
 * `theme/useClubColors.ts`).
 */

/** WCAG-ish kontrast: bijela ili tamna boja teksta preko dane pozadine. */
export const contrastColor = (hex: string): string => {
  const raw = hex.replace('#', '')
  const r = parseInt(raw.slice(0, 2), 16)
  const g = parseInt(raw.slice(2, 4), 16)
  const b = parseInt(raw.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#1A1A1A' : '#FFFFFF'
}

export type MerchantColors = {
  primary: string
  accent: string
  onPrimary: string
  onAccent: string
}

export const merchantColors = (brand: MerchantBrand): MerchantColors => ({
  primary: brand.primaryHex,
  accent: brand.accentHex,
  onPrimary: contrastColor(brand.primaryHex),
  onAccent: contrastColor(brand.accentHex),
})
