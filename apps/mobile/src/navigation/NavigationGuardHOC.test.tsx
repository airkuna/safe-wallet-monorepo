import React from 'react'
import { Text } from 'react-native'
import { renderWithStore, createTestStore } from '@/src/tests/test-utils'
import { ONBOARDING_VERSION } from '@/src/config/constants'
import { resetScreenPreviewSeedForTests, PREVIEW_SAFE } from '@/src/custom/preview/screenPreview'
import { NavigationGuardHOC } from './NavigationGuardHOC'

const mockReplace = jest.fn()
const mockPush = jest.fn()
const mockNavigate = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, navigate: mockNavigate }),
  useSegments: () => [''],
}))

jest.mock('@/src/features/AppUpdate/hooks/useAppUpdateCheck', () => ({
  useAppUpdateCheck: () => ({ requiresForceUpdate: false, recommendsUpdate: false, isLoading: false }),
}))

jest.mock('@/src/hooks/useBiometrics', () => ({
  useBiometrics: jest.fn(),
}))

jest.mock('@/src/services/remoteConfig/remoteConfigService', () => ({
  remoteConfigService: { getPlatformString: jest.fn() },
}))

describe('NavigationGuardHOC screen preview gating', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.EXPO_PUBLIC_SCREEN_PREVIEW
    resetScreenPreviewSeedForTests()
  })

  // NOTE: the module-level `navigated` flag in NavigationGuardHOC persists across
  // tests in this file. The flag-on test must run first — it leaves `navigated`
  // false, so the flag-off test still exercises the initial redirect.
  it('with EXPO_PUBLIC_SCREEN_PREVIEW=1 skips the initial redirect and seeds preview state', () => {
    process.env.EXPO_PUBLIC_SCREEN_PREVIEW = '1'

    const { getByText, store } = renderGuard()

    expect(getByText('child')).toBeTruthy()
    expect(mockReplace).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()

    const state = store.getState()
    expect(state.settings.onboardingVersionSeen).toBe(ONBOARDING_VERSION)
    expect(state.notifications.promptAttempts).toBeGreaterThan(0)
    expect(state.activeSafe).toEqual(PREVIEW_SAFE)
  })

  it('without the flag redirects to onboarding as before', () => {
    const { store } = renderGuard()

    expect(mockReplace).toHaveBeenCalledWith('/onboarding')
    expect(store.getState().settings.onboardingVersionSeen).toBe('')
    expect(store.getState().activeSafe).toBeNull()
  })
})

function renderGuard() {
  const store = createTestStore()
  const result = renderWithStore(
    <NavigationGuardHOC>
      <Text>child</Text>
    </NavigationGuardHOC>,
    store,
  )
  return { ...result, store }
}
