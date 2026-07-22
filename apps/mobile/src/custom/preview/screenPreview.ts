import { useLayoutEffect } from 'react'
import type { Dispatch } from '@reduxjs/toolkit'
import type { SafeOverview } from '@safe-global/store/gateway/AUTO_GENERATED/safes'
import { useAppDispatch } from '@/src/store/hooks'
import { updateSettings } from '@/src/store/settingsSlice'
import { updatePromptAttempts } from '@/src/store/notificationsSlice'
import { addSafe } from '@/src/store/safesSlice'
import { setActiveSafe } from '@/src/store/activeSafeSlice'
import { ONBOARDING_VERSION } from '@/src/config/constants'
import type { SafeInfo } from '@/src/types/address'

/**
 * Dev-only "screen preview" mode for the web preview (WEB_PREVIEW=1):
 * with EXPO_PUBLIC_SCREEN_PREVIEW=1 the initial onboarding/(tabs) redirect is
 * skipped so any screen can be opened directly by URL (see /_sitemap), and a
 * minimal read-only state is seeded so screens have data to render.
 */

// Same read-only Sepolia Safe as the e2e fixtures (src/tests/e2e-maestro/setup/mockData.ts);
// staging CGW serves real data for it.
export const PREVIEW_SAFE: SafeInfo = {
  address: '0x2f3e600a3F38b66aDcbe6530B191F2BE55c2Fbb6',
  chainId: '11155111',
}

const previewSafeOverview: SafeOverview = {
  address: { value: PREVIEW_SAFE.address, name: null, logoUri: null },
  awaitingConfirmation: null,
  chainId: PREVIEW_SAFE.chainId,
  fiatTotal: '0',
  owners: [
    { value: '0x3336745b7EA628F5134Bd9d08aa68b4979fA3472', name: null, logoUri: null },
    { value: '0x81BdB0a66065363F704A105D67D53d090aD14fec', name: null, logoUri: null },
    { value: '0x4d5CF9E6df9a95F4c1F5398706cA27218add5949', name: null, logoUri: null },
  ],
  queued: 0,
  threshold: 1,
}

export const isScreenPreviewEnabled = (): boolean => __DEV__ && process.env.EXPO_PUBLIC_SCREEN_PREVIEW === '1'

export const seedScreenPreviewState = (dispatch: Dispatch): void => {
  dispatch(updateSettings({ onboardingVersionSeen: ONBOARDING_VERSION }))
  dispatch(updatePromptAttempts(1))
  dispatch(
    addSafe({
      address: PREVIEW_SAFE.address,
      info: { [PREVIEW_SAFE.chainId]: previewSafeOverview },
    }),
  )
  dispatch(setActiveSafe(PREVIEW_SAFE))
}

let seeded = false
let rootRedirected = false

export const resetScreenPreviewSeedForTests = (): void => {
  seeded = false
  rootRedirected = false
}

/**
 * In preview mode the root index has no content (its boot redirect is skipped),
 * so land the bare "/" URL on (tabs) — once per boot; deep URLs stay untouched.
 */
export const maybeRedirectPreviewRoot = (segments: string[], router: { replace: (href: '/(tabs)') => void }): void => {
  if (rootRedirected || segments.some(Boolean)) {
    return
  }
  rootRedirected = true
  router.replace('/(tabs)')
}

/**
 * Returns whether screen preview is active and, if so, seeds the preview state
 * once per app boot (layout effect => runs before the passive navigation effects).
 */
export const useScreenPreview = (): boolean => {
  const enabled = isScreenPreviewEnabled()
  const dispatch = useAppDispatch()

  useLayoutEffect(() => {
    if (enabled && !seeded) {
      seeded = true
      seedScreenPreviewState(dispatch)
    }
  }, [enabled, dispatch])

  return enabled
}
