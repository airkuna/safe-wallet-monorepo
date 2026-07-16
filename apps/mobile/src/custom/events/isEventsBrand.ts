import { getBrand } from '@/src/custom/brand'

/**
 * Događaji se pale isključivo brand manifestom (`features.events`), pa `safe`
 * i ostali buildovi bez flaga ostaju vizualno i funkcionalno netaknuti.
 */
export const isEventsBrand = (): boolean => getBrand().features?.events === true
