import { waitFor } from '@testing-library/react-native'
import { renderHookWithStore, createTestStore } from '@/src/tests/test-utils'
import { useCounterfactualBalances } from './useCounterfactualBalances'
import { createWeb3ReadOnly } from '@/src/services/web3'
import type { Chain } from '@safe-global/store/gateway/AUTO_GENERATED/chains'

jest.mock('@/src/services/web3', () => ({
  createWeb3ReadOnly: jest.fn(),
}))

const mockCreateWeb3ReadOnly = createWeb3ReadOnly as jest.MockedFunction<typeof createWeb3ReadOnly>

const chain = {
  chainId: '1',
  chainName: 'Ethereum',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18, logoUri: 'https://example.org/eth.png' },
  rpcUri: { authentication: 'NO_AUTHENTICATION', value: 'https://rpc.example.org' },
} as Chain

const safeAddress = '0x1111111111111111111111111111111111111111'

describe('useCounterfactualBalances', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shapes the RPC native balance like a CGW Balances payload', async () => {
    const getBalance = jest.fn().mockResolvedValue(1500000000000000000n)
    mockCreateWeb3ReadOnly.mockReturnValue({ getBalance, destroy: jest.fn() } as unknown as ReturnType<
      typeof createWeb3ReadOnly
    >)

    const { result } = renderHookWithStore(() => useCounterfactualBalances(chain, safeAddress), createTestStore())

    await waitFor(() => {
      const [data] = result.current
      expect(data).toBeDefined()
    })

    const [data, error] = result.current
    expect(error).toBeUndefined()
    expect(getBalance).toHaveBeenCalledWith(safeAddress)
    expect(data?.items).toHaveLength(1)
    expect(data?.items[0].balance).toBe('1500000000000000000')
    expect(data?.items[0].tokenInfo.symbol).toBe('ETH')
    expect(data?.fiatTotal).toBe('0')
  })

  it('returns no data when chain or address is missing', async () => {
    const { result } = renderHookWithStore(() => useCounterfactualBalances(undefined, undefined), createTestStore())

    await waitFor(() => {
      const [data, , loading] = result.current
      expect(data).toBeUndefined()
      expect(loading).toBe(false)
    })
    expect(mockCreateWeb3ReadOnly).not.toHaveBeenCalled()
  })

  it('surfaces RPC failures as the error result', async () => {
    const getBalance = jest.fn().mockRejectedValue(new Error('rpc down'))
    mockCreateWeb3ReadOnly.mockReturnValue({ getBalance, destroy: jest.fn() } as unknown as ReturnType<
      typeof createWeb3ReadOnly
    >)

    const { result } = renderHookWithStore(() => useCounterfactualBalances(chain, safeAddress), createTestStore())

    await waitFor(() => {
      const [, error] = result.current
      expect(error?.message).toBe('rpc down')
    })
  })
})
