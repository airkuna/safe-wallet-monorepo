import { getBrand } from '@/src/custom/brand'

/**
 * Donacije se pale isključivo brand manifestom (`features.donations`), pa
 * `safe` i ostali buildovi bez flaga ostaju vizualno i funkcionalno netaknuti.
 */
export const isDonationsBrand = (): boolean => getBrand().features?.donations === true
