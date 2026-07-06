import React from 'react'
import { render } from '@/src/tests/test-utils'
import { CounterfactualBannerContainer } from './CounterfactualBanner.container'
import { useNativeBalance } from '../../hooks/useNativeBalance'
import { PendingSafeStatus, UndeployedSafe } from '@safe-global/utils/features/counterfactual/store/types'
import type { PayMethod } from '@safe-global/utils/features/counterfactual/types'
import { Address } from '@/src/types/address'

jest.mock('../../hooks/useNativeBalance', () => ({
  useNativeBalance: jest.fn(),
}))

const mockUseNativeBalance = useNativeBalance as jest.MockedFunction<typeof useNativeBalance>

const safeAddress = '0x1111111111111111111111111111111111111111' as Address

const undeployedSafe: UndeployedSafe = {
  status: { status: PendingSafeStatus.AWAITING_EXECUTION, type: 'PayLater' as PayMethod },
  props: {
    safeAccountConfig: { owners: ['0x2222222222222222222222222222222222222222'], threshold: 1 },
    safeDeploymentConfig: { saltNonce: '0', safeVersion: '1.4.1' },
  },
}

describe('CounterfactualBannerContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseNativeBalance.mockReturnValue(undefined)
  })

  it('renders the activation banner for an undeployed active safe', () => {
    const { getByTestId, getByText } = render(<CounterfactualBannerContainer />, {
      initialStore: {
        activeSafe: { address: safeAddress, chainId: '1' },
        undeployedSafes: { [safeAddress]: { '1': undeployedSafe } },
      },
    })

    expect(getByTestId('counterfactual-banner')).toBeTruthy()
    expect(getByText('Account not activated yet')).toBeTruthy()
  })

  it('shows the native balance when available', () => {
    mockUseNativeBalance.mockReturnValue('0.5 ETH')

    const { getByText } = render(<CounterfactualBannerContainer />, {
      initialStore: {
        activeSafe: { address: safeAddress, chainId: '1' },
        undeployedSafes: { [safeAddress]: { '1': undeployedSafe } },
      },
    })

    expect(getByText(/Balance: 0.5 ETH/)).toBeTruthy()
  })

  it('renders nothing for a deployed safe', () => {
    const { queryByTestId } = render(<CounterfactualBannerContainer />, {
      initialStore: {
        activeSafe: { address: safeAddress, chainId: '1' },
        undeployedSafes: {},
      },
    })

    expect(queryByTestId('counterfactual-banner')).toBeNull()
  })

  it('renders nothing when the safe is undeployed on another chain only', () => {
    const { queryByTestId } = render(<CounterfactualBannerContainer />, {
      initialStore: {
        activeSafe: { address: safeAddress, chainId: '100' },
        undeployedSafes: { [safeAddress]: { '1': undeployedSafe } },
      },
    })

    expect(queryByTestId('counterfactual-banner')).toBeNull()
  })

  it('renders nothing without an active safe', () => {
    const { queryByTestId } = render(<CounterfactualBannerContainer />, {
      initialStore: {
        undeployedSafes: { [safeAddress]: { '1': undeployedSafe } },
      },
    })

    expect(queryByTestId('counterfactual-banner')).toBeNull()
  })
})
