import React from 'react'
import { render } from '@/src/tests/test-utils'
import { AssetsHeader } from './AssetsHeader'
import { PendingSafeStatus, UndeployedSafe } from '@safe-global/utils/features/counterfactual/store/types'
import type { PayMethod } from '@safe-global/utils/features/counterfactual/types'
import { Address } from '@/src/types/address'

jest.mock('@/src/features/CreateSafe/hooks/useNativeBalance', () => ({
  useNativeBalance: jest.fn(),
}))

const safeAddress = '0x1111111111111111111111111111111111111111' as Address

const undeployedSafe: UndeployedSafe = {
  status: { status: PendingSafeStatus.AWAITING_EXECUTION, type: 'PayLater' as PayMethod },
  props: {
    safeAccountConfig: { owners: ['0x2222222222222222222222222222222222222222'], threshold: 1 },
    safeDeploymentConfig: { saltNonce: '0', safeVersion: '1.4.1' },
  },
}

const defaultProps = {
  amount: 0,
  isLoading: false,
  onPendingTransactionsPress: jest.fn(),
  hasMore: false,
}

describe('AssetsHeader', () => {
  it('renders without the counterfactual banner for a deployed safe', () => {
    const { queryByTestId, getByTestId } = render(<AssetsHeader {...defaultProps} />, {
      initialStore: {
        activeSafe: { address: safeAddress, chainId: '1' },
      },
    })

    expect(getByTestId('receive-button')).toBeTruthy()
    expect(queryByTestId('counterfactual-banner')).toBeNull()
  })

  it('renders the counterfactual banner for an undeployed active safe', () => {
    const { getByTestId } = render(<AssetsHeader {...defaultProps} />, {
      initialStore: {
        activeSafe: { address: safeAddress, chainId: '1' },
        undeployedSafes: { [safeAddress]: { '1': undeployedSafe } },
      },
    })

    expect(getByTestId('counterfactual-banner')).toBeTruthy()
  })
})
