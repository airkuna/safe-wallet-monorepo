import React from 'react'
import { act, fireEvent, render } from '@/src/tests/test-utils'
import { CommonActions } from '@react-navigation/native'
import type { Chain } from '@safe-global/store/gateway/AUTO_GENERATED/chains'
import { CreateSafeContainer } from './CreateSafe.container'
import { useCreateSafe } from './hooks/useCreateSafe'
import type { Address } from '@/src/types/address'

const SAFE_ADDRESS = '0x3333333333333333333333333333333333333333' as Address

const mockNavigationDispatch = jest.fn()

jest.mock('expo-router', () => ({
  useNavigation: () => ({ dispatch: mockNavigationDispatch }),
}))

const mockIsIdentityEnabled = jest.fn(() => false)

jest.mock('@/src/custom/identity', () => ({
  isIdentityEnabled: () => mockIsIdentityEnabled(),
}))

jest.mock('./hooks/useCreateSafe', () => ({
  useCreateSafe: jest.fn(),
}))

const chains = [{ chainId: '1', chainName: 'Ethereum', chainLogoUri: null }] as unknown as Chain[]

// selectAllChains reads the RTK Query cache; a preloaded store cannot feed it.
jest.mock('@/src/store/chains', () => ({
  selectAllChains: () => chains,
}))

const mockUseCreateSafe = useCreateSafe as jest.MockedFunction<typeof useCreateSafe>
const mockCreateSafe = jest.fn()

const renderContainer = () => render(<CreateSafeContainer />)

describe('CreateSafeContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseCreateSafe.mockReturnValue({ createSafe: mockCreateSafe, status: 'idle', error: undefined })
    mockCreateSafe.mockResolvedValue(SAFE_ADDRESS)
  })

  it('resets straight to home after creation when identity is disabled (stock behavior)', async () => {
    mockIsIdentityEnabled.mockReturnValue(false)
    const { getByTestId } = renderContainer()

    await act(async () => {
      fireEvent.press(getByTestId('create-safe-submit'))
    })

    expect(mockNavigationDispatch).toHaveBeenCalledTimes(1)
    expect(mockNavigationDispatch).toHaveBeenCalledWith(
      CommonActions.reset({ routes: [{ key: '(tabs)', name: '(tabs)' }] }),
    )
  })

  it('routes to the optional username step after creation when identity is enabled', async () => {
    mockIsIdentityEnabled.mockReturnValue(true)
    const { getByTestId } = renderContainer()

    await act(async () => {
      fireEvent.press(getByTestId('create-safe-submit'))
    })

    expect(mockNavigationDispatch).toHaveBeenCalledTimes(1)
    expect(mockNavigationDispatch).toHaveBeenCalledWith(
      CommonActions.reset({
        routes: [
          { key: '(tabs)', name: '(tabs)' },
          { name: 'create-safe-username', params: { safeAddress: SAFE_ADDRESS, chainId: '1' } },
        ],
      }),
    )
  })

  it('does not navigate when creation fails, regardless of identity', async () => {
    mockIsIdentityEnabled.mockReturnValue(true)
    mockCreateSafe.mockResolvedValue(undefined)
    const { getByTestId } = renderContainer()

    await act(async () => {
      fireEvent.press(getByTestId('create-safe-submit'))
    })

    expect(mockNavigationDispatch).not.toHaveBeenCalled()
  })
})
