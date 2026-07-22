import { getBrand } from '@/src/custom/brand'

/**
 * Zero-fee UX se pali brand manifestom (`features.donations`, v. [15] §6) —
 * `safe` i ostali buildovi bez flaga zadržavaju upstream copy netaknut.
 */
export const isZeroFeeBrand = (): boolean => getBrand().features?.donations === true
