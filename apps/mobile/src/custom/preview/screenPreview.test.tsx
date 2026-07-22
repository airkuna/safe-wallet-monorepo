import { renderHookWithStore, createTestStore } from '@/src/tests/test-utils'
import { ONBOARDING_VERSION } from '@/src/config/constants'
import { isScreenPreviewEnabled, useScreenPreview, resetScreenPreviewSeedForTests, PREVIEW_SAFE } from './screenPreview'

const globalWithDev = globalThis as { __DEV__?: boolean }

describe('screenPreview', () => {
  const originalFlag = process.env.EXPO_PUBLIC_SCREEN_PREVIEW
  const originalDev = globalWithDev.__DEV__

  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_SCREEN_PREVIEW
    globalWithDev.__DEV__ = originalDev
    resetScreenPreviewSeedForTests()
  })

  afterAll(() => {
    if (originalFlag === undefined) {
      delete process.env.EXPO_PUBLIC_SCREEN_PREVIEW
    } else {
      process.env.EXPO_PUBLIC_SCREEN_PREVIEW = originalFlag
    }
    globalWithDev.__DEV__ = originalDev
  })

  describe('isScreenPreviewEnabled', () => {
    it('is disabled by default', () => {
      expect(isScreenPreviewEnabled()).toBe(false)
    })

    it('is enabled with EXPO_PUBLIC_SCREEN_PREVIEW=1 in dev', () => {
      process.env.EXPO_PUBLIC_SCREEN_PREVIEW = '1'
      expect(isScreenPreviewEnabled()).toBe(true)
    })

    it('is disabled outside __DEV__ even with the flag set', () => {
      process.env.EXPO_PUBLIC_SCREEN_PREVIEW = '1'
      globalWithDev.__DEV__ = false
      expect(isScreenPreviewEnabled()).toBe(false)
    })

    it('is disabled for values other than "1"', () => {
      process.env.EXPO_PUBLIC_SCREEN_PREVIEW = 'true'
      expect(isScreenPreviewEnabled()).toBe(false)
    })
  })

  describe('useScreenPreview', () => {
    it('does not seed state when the flag is off', () => {
      const store = createTestStore()
      const { result } = renderHookWithStore(() => useScreenPreview(), store)

      expect(result.current).toBe(false)
      const state = store.getState()
      expect(state.settings.onboardingVersionSeen).toBe('')
      expect(state.notifications.promptAttempts).toBe(0)
      expect(state.activeSafe).toBeNull()
      expect(state.safes).toEqual({})
    })

    it('seeds onboarding, prompt attempts and a read-only active Safe when the flag is on', () => {
      process.env.EXPO_PUBLIC_SCREEN_PREVIEW = '1'

      const store = createTestStore()
      const { result } = renderHookWithStore(() => useScreenPreview(), store)

      expect(result.current).toBe(true)
      const state = store.getState()
      expect(state.settings.onboardingVersionSeen).toBe(ONBOARDING_VERSION)
      expect(state.notifications.promptAttempts).toBeGreaterThan(0)
      expect(state.activeSafe).toEqual(PREVIEW_SAFE)
      expect(state.safes[PREVIEW_SAFE.address][PREVIEW_SAFE.chainId].address.value).toBe(PREVIEW_SAFE.address)
    })

    it('seeds only once per boot', () => {
      process.env.EXPO_PUBLIC_SCREEN_PREVIEW = '1'

      const firstStore = createTestStore()
      const first = renderHookWithStore(() => useScreenPreview(), firstStore)
      const attemptsAfterFirst = firstStore.getState().notifications.promptAttempts
      first.unmount()

      const secondStore = createTestStore()
      const second = renderHookWithStore(() => useScreenPreview(), secondStore)
      expect(second.result.current).toBe(true)
      // promptAttempts increments on every seed — a second mount must not re-seed
      expect(secondStore.getState().notifications.promptAttempts).toBe(0)
      expect(attemptsAfterFirst).toBeGreaterThan(0)
    })
  })
})
