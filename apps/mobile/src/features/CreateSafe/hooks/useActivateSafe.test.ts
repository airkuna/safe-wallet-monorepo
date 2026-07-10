import { act } from '@testing-library/react-native'
import { createTestStore, renderHookWithStore } from '@/src/tests/test-utils'
import { useActivateSafe } from './useActivateSafe'
import { activateSafeWithRelay, activateSafeWithSigner } from '../logic/activateSafe'
import { selectChainById } from '@/src/store/chains'
import { getPrivateKey } from '@/src/hooks/useSign/useSign'
import { PendingSafeStatus, UndeployedSafe } from '@safe-global/utils/features/counterfactual/store/types'
import type { PayMethod } from '@safe-global/utils/features/counterfactual/types'
import type { Chain } from '@safe-global/store/gateway/AUTO_GENERATED/chains'
import { Address } from '@/src/types/address'
import { FEATURES } from '@safe-global/utils/utils/chains'

jest.mock('../logic/activateSafe', () => ({
  activateSafeWithRelay: jest.fn(),
  activateSafeWithSigner: jest.fn(),
}))

jest.mock('@/src/hooks/useSign/useSign', () => ({
  getPrivateKey: jest.fn(),
}))

jest.mock('@/src/store/chains', () => ({
  selectChainById: jest.fn(),
}))

const mockActivateWithRelay = activateSafeWithRelay as jest.MockedFunction<typeof activateSafeWithRelay>
const mockActivateWithSigner = activateSafeWithSigner as jest.MockedFunction<typeof activateSafeWithSigner>
const mockGetPrivateKey = getPrivateKey as jest.MockedFunction<typeof getPrivateKey>
const mockSelectChainById = selectChainById as jest.MockedFunction<typeof selectChainById>

const safeAddress = '0x1111111111111111111111111111111111111111' as Address
const ownerAddress = '0x2222222222222222222222222222222222222222'

const undeployedSafe: UndeployedSafe = {
  status: { status: PendingSafeStatus.AWAITING_EXECUTION, type: 'PayLater' as PayMethod },
  props: {
    safeAccountConfig: { owners: [ownerAddress], threshold: 1 },
    safeDeploymentConfig: { saltNonce: '0', safeVersion: '1.4.1' },
  },
}

const buildChain = (features: string[]): Chain =>
  ({
    chainId: '1',
    chainName: 'Ethereum',
    features,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  }) as unknown as Chain

const initialStore = {
  activeSafe: { address: safeAddress, chainId: '1' },
  undeployedSafes: { [safeAddress]: { '1': undeployedSafe } },
}

describe('useActivateSafe', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('activates through the signer EOA when the chain has no relay and clears the marker', async () => {
    mockSelectChainById.mockReturnValue(buildChain([]))
    mockGetPrivateKey.mockResolvedValue('0xkey')
    mockActivateWithSigner.mockResolvedValue('0xhash')

    const store = createTestStore(initialStore)
    const { result } = renderHookWithStore(() => useActivateSafe(), store)

    await act(async () => {
      await result.current.activate()
    })

    expect(mockGetPrivateKey).toHaveBeenCalledWith(ownerAddress)
    expect(mockActivateWithSigner).toHaveBeenCalledWith(expect.anything(), undeployedSafe.props, '0xkey')
    expect(mockActivateWithRelay).not.toHaveBeenCalled()
    expect(result.current.status).toBe('success')
    expect(store.getState().undeployedSafes[safeAddress]).toBeUndefined()
  })

  it('activates through the relay when the chain sponsors it', async () => {
    mockSelectChainById.mockReturnValue(buildChain([FEATURES.RELAYING]))
    mockActivateWithRelay.mockResolvedValue('task-id')

    const store = createTestStore(initialStore)
    const { result } = renderHookWithStore(() => useActivateSafe(), store)

    await act(async () => {
      await result.current.activate()
    })

    expect(mockActivateWithRelay).toHaveBeenCalledWith(
      expect.anything(),
      undeployedSafe.props,
      safeAddress,
      expect.any(Function),
    )
    expect(mockActivateWithSigner).not.toHaveBeenCalled()
    expect(result.current.status).toBe('success')
    expect(store.getState().undeployedSafes[safeAddress]).toBeUndefined()
  })

  it('keeps the marker and reports the error when activation fails', async () => {
    mockSelectChainById.mockReturnValue(buildChain([]))
    mockGetPrivateKey.mockResolvedValue('0xkey')
    mockActivateWithSigner.mockRejectedValue(new Error('boom'))

    const store = createTestStore(initialStore)
    const { result } = renderHookWithStore(() => useActivateSafe(), store)

    await act(async () => {
      await result.current.activate()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('boom')
    expect(store.getState().undeployedSafes[safeAddress]?.['1']).toEqual(undeployedSafe)
  })
})
