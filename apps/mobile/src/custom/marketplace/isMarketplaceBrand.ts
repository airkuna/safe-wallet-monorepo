import { getBrand } from '@/src/custom/brand'

/**
 * Tržnica se pali isključivo brand manifestom (`features.marketplace`), pa
 * `safe` i ostali buildovi bez flaga ostaju vizualno i funkcionalno netaknuti.
 */
export const isMarketplaceBrand = (): boolean => getBrand().features?.marketplace === true
