import { isZeroFeeBrand } from './isZeroFeeBrand'
import { zfStrings } from './strings'

export interface RelayCopy {
  title: string
  subtitle: string
  freeLabel: string
  remainingToday: (remaining: number) => string
  unavailable: string
}

/**
 * HR "Bez naknade" copy za relay put izvršenja — `null` na ne-zerofee
 * brandovima, pa upstream komponente (RelayAvailable/RelayUnavailable/
 * RelayFee) zadržavaju svoje engleske stringove bajt-za-bajt (thin seam).
 */
export const getRelayCopy = (): RelayCopy | null => (isZeroFeeBrand() ? zfStrings.relay : null)
