import { FEATURES, hasFeature } from '@safe-global/utils/utils/chains'
import { useAppSelector } from '@/src/store/hooks'
import { selectActiveChain } from '@/src/store/chains'
import { isBrandForcedFeature } from '@/src/custom/features/forcedFeatures'

export const useHasFeature = (feature: FEATURES): boolean | undefined => {
  const chain = useAppSelector(selectActiveChain)
  // Brand seam: manifest-forced features (allowlisted) win over the CGW flag.
  if (isBrandForcedFeature(feature)) {
    return true
  }
  return chain ? hasFeature(chain, feature) : undefined
}
