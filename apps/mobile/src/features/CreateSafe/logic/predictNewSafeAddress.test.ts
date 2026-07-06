import { buildNewSafeProps, predictNewSafeAddress, NEW_SAFE_SALT_NONCE } from './predictNewSafeAddress'
import { predictSafeAddress, SafeProvider } from '@safe-global/protocol-kit'
import { getRpcServiceUrl } from '@/src/services/web3'
import type { Chain } from '@safe-global/store/gateway/AUTO_GENERATED/chains'

jest.mock('@safe-global/protocol-kit', () => ({
  predictSafeAddress: jest.fn(),
  SafeProvider: jest.fn().mockImplementation(({ provider }: { provider: string }) => ({ provider })),
}))

jest.mock('@/src/services/web3', () => ({
  getRpcServiceUrl: jest.fn(),
}))

const mockPredictSafeAddress = predictSafeAddress as jest.MockedFunction<typeof predictSafeAddress>
const mockGetRpcServiceUrl = getRpcServiceUrl as jest.MockedFunction<typeof getRpcServiceUrl>

const ownerAddress = '0x2222222222222222222222222222222222222222'
const predictedAddress = '0x3333333333333333333333333333333333333333'

const buildChain = (overrides: Partial<Chain> = {}): Chain =>
  ({
    chainId: '1',
    chainName: 'Ethereum',
    rpcUri: { authentication: 'NO_AUTHENTICATION', value: 'https://rpc.example.org' },
    recommendedMasterCopyVersion: '1.4.1',
    ...overrides,
  }) as Chain

describe('buildNewSafeProps', () => {
  it('builds a 1/1 predicted safe config with a fixed salt', () => {
    const props = buildNewSafeProps(buildChain(), ownerAddress)

    expect(props.safeAccountConfig.owners).toEqual([ownerAddress])
    expect(props.safeAccountConfig.threshold).toBe(1)
    expect(props.safeDeploymentConfig?.saltNonce).toBe(NEW_SAFE_SALT_NONCE)
    expect(props.safeDeploymentConfig?.safeVersion).toBe('1.4.1')
  })
})

describe('predictNewSafeAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPredictSafeAddress.mockResolvedValue(predictedAddress)
    mockGetRpcServiceUrl.mockReturnValue('https://rpc.example.org')
  })

  it('predicts the address with the exact props it returns', async () => {
    const chain = buildChain()
    const { address, props } = await predictNewSafeAddress(chain, ownerAddress)

    expect(address).toBe(predictedAddress)
    expect(SafeProvider).toHaveBeenCalledWith({ provider: 'https://rpc.example.org' })
    expect(mockPredictSafeAddress).toHaveBeenCalledWith({
      safeProvider: expect.any(Object),
      chainId: 1n,
      safeAccountConfig: props.safeAccountConfig,
      safeDeploymentConfig: props.safeDeploymentConfig,
    })
  })

  it('throws when the chain has no usable RPC url', async () => {
    mockGetRpcServiceUrl.mockReturnValue('')

    await expect(predictNewSafeAddress(buildChain(), ownerAddress)).rejects.toThrow('No RPC url available for chain 1')
    expect(mockPredictSafeAddress).not.toHaveBeenCalled()
  })
})
