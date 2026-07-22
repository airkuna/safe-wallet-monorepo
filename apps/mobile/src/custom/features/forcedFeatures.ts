import { FEATURES } from '@safe-global/utils/utils/chains'
import { getBrand } from '@/src/custom/brand'

/**
 * Brand-gated CGW feature overrides. Some CGW feature flags are client rollout
 * switches rather than backend capability gates (e.g. SEND_FLOW: the CGW
 * preview/nonces/propose endpoints work regardless of the flag — the web app
 * does not gate sending on it at all). A brand that targets a chain where Safe
 * has not enabled such a flag can force it on via its manifest.
 *
 * Only flags in this allowlist can be forced — the manifest cannot override
 * arbitrary CGW features. Brands without the flag (safe, domovina) resolve
 * every feature exactly as upstream does.
 */
const MANIFEST_FLAG_TO_FEATURE: Record<string, FEATURES> = {
  forceSendFlow: FEATURES.SEND_FLOW,
}

export const isBrandForcedFeature = (feature: FEATURES): boolean => {
  const brandFeatures = getBrand().features
  if (!brandFeatures) {
    return false
  }
  return Object.entries(MANIFEST_FLAG_TO_FEATURE).some(
    ([flag, mapped]) => mapped === feature && brandFeatures[flag] === true,
  )
}
