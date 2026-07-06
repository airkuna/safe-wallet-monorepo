import { act } from '@testing-library/react-native'
import { createTestStore, renderHookWithStore } from '@/src/tests/test-utils'
import { useCreateSafe } from './useCreateSafe'
import { predictNewSafeAddress } from '../logic/predictNewSafeAddress'
import { storePrivateKey } from '@/src/hooks/useSign/useSign'
import { PendingSafeStatus } from '@safe-global/utils/features/counterfactual/store/types'
import type { Chain } from '@safe-global/store/gateway/AUTO_GENERATED/chains'
import type { Address } from '@/src/types/address'

jest.mock('../logic/predictNewSafeAddress', () => ({
  predictNewSafeAddress: jest.fn(),
}))

jest.mock('@/src/hooks/useSign/useSign', () => ({
  storePrivateKey: jest.fn(),
}))

const mockPredictNewSafeAddress = predictNewSafeAddress as jest.MockedFunction<typeof predictNewSafeAddress>
const mockStorePrivateKey = storePrivateKey as jest.MockedFunction<typeof storePrivateKey>

const predictedAddress = '0x3333333333333333333333333333333333333333' as Address

const chain = {
  chainId: '1',
  chainName: 'Ethereum',
  rpcUri: { authentication: 'NO_AUTHENTICATION', value: 'https://rpc.example.org' },
} as Chain

describe('useCreateSafe', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockStorePrivateKey.mockResolvedValue(undefined)
    mockPredictNewSafeAddress.mockImplementation(async (_chain, ownerAddress) => ({
      address: predictedAddress,
      props: {
        safeAccountConfig: { owners: [ownerAddress], threshold: 1 },
        safeDeploymentConfig: { saltNonce: '0', safeVersion: '1.4.1' },
      },
    }))
  })

  it('creates a counterfactual safe and records everything in the store', async () => {
    const store = createTestStore()
    const { result } = renderHookWithStore(() => useCreateSafe(), store)

    let address: Address | undefined
    await act(async () => {
      address = await result.current.createSafe('My account', chain)
    })

    expect(address).toBe(predictedAddress)
    expect(result.current.status).toBe('idle')

    const state = store.getState()
    const ownerAddress = Object.keys(state.signers)[0]

    // A fresh signer was generated and persisted through the shared keystore
    expect(mockStorePrivateKey).toHaveBeenCalledTimes(1)
    expect(mockStorePrivateKey.mock.calls[0][0]).toBe(ownerAddress)
    expect(state.signers[ownerAddress].type).toBe('private-key')

    // The counterfactual marker holds the deployment props
    const undeployed = state.undeployedSafes[predictedAddress]['1']
    expect(undeployed.status.status).toBe(PendingSafeStatus.AWAITING_EXECUTION)
    expect(undeployed.props.safeAccountConfig.owners).toEqual([ownerAddress])

    // The account renders like any imported safe
    const overview = state.safes[predictedAddress]['1']
    expect(overview.threshold).toBe(1)
    expect(overview.owners).toEqual([{ value: ownerAddress, name: null, logoUri: null }])
    expect(overview.fiatTotal).toBe('0')

    expect(state.activeSafe).toEqual({ address: predictedAddress, chainId: '1' })
    expect(state.activeSigner[predictedAddress].value).toBe(ownerAddress)
    expect(state.addressBook.contacts[predictedAddress].name).toBe('My account')
  })

  it('writes nothing to the store when persisting the key fails', async () => {
    mockStorePrivateKey.mockRejectedValue(new Error('Biometric prompt cancelled'))

    const store = createTestStore()
    const { result } = renderHookWithStore(() => useCreateSafe(), store)

    let address: Address | undefined
    await act(async () => {
      address = await result.current.createSafe('My account', chain)
    })

    expect(address).toBeUndefined()
    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('Biometric prompt cancelled')

    const state = store.getState()
    expect(state.safes).toEqual({})
    expect(state.undeployedSafes).toEqual({})
    expect(state.signers).toEqual({})
    expect(state.activeSafe).toBeNull()
  })

  it('surfaces prediction failures as an error state', async () => {
    mockPredictNewSafeAddress.mockRejectedValue(new Error('RPC unavailable'))

    const store = createTestStore()
    const { result } = renderHookWithStore(() => useCreateSafe(), store)

    await act(async () => {
      await result.current.createSafe('My account', chain)
    })

    expect(result.current.status).toBe('error')
    expect(mockStorePrivateKey).not.toHaveBeenCalled()
    expect(store.getState().undeployedSafes).toEqual({})
  })
})
