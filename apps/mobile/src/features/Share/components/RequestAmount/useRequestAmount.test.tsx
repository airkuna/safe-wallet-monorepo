import { act, renderHook } from '@/src/tests/test-utils'
import type { Balance } from '@safe-global/store/gateway/AUTO_GENERATED/balances'
import { useRequestAmount } from './useRequestAmount'

const SAFE_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

jest.mock('@/src/store/hooks/activeSafe', () => ({
  useDefinedActiveSafe: () => ({ address: SAFE_ADDRESS, chainId: '1' }),
}))

const mockChain = jest.fn()
jest.mock('@/src/store/chains', () => ({
  ...jest.requireActual('@/src/store/chains'),
  selectChainById: () => mockChain(),
}))

const mockBalances = jest.fn()
jest.mock('@/src/features/Assets/components/Tokens/useTokenBalances', () => ({
  useTokenBalances: () => mockBalances(),
}))

jest.mock('@/src/custom/paymentLinks', () => ({
  buildPaymentLink: (uri: string) => `link://pay?uri=${uri}`,
}))

const usdcBalance: Balance = {
  balance: '10000000',
  fiatBalance: '10',
  fiatConversion: '1',
  tokenInfo: {
    address: USDC,
    decimals: 6,
    logoUri: '',
    name: 'USD Coin',
    symbol: 'USDC',
    type: 'ERC20',
  },
}

describe('useRequestAmount', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockChain.mockReturnValue({
      chainId: '1',
      nativeCurrency: { symbol: 'ETH', decimals: 18, logoUri: '' },
    })
    mockBalances.mockReturnValue({ visibleItems: [usdcBalance] })
  })

  it('defaults to the native token with a value-less EIP-681 URI', () => {
    const { result } = renderHook(() => useRequestAmount())

    expect(result.current.selectedToken.symbol).toBe('ETH')
    expect(result.current.eip681Uri).toBe(`ethereum:${SAFE_ADDRESS}@1`)
  })

  it('adds the amount in wei once entered', () => {
    const { result } = renderHook(() => useRequestAmount())

    act(() => result.current.handleAmountChange('1.5'))

    expect(result.current.eip681Uri).toBe(`ethereum:${SAFE_ADDRESS}@1?value=1500000000000000000`)
    expect(result.current.paymentLink).toBe(`link://pay?uri=ethereum:${SAFE_ADDRESS}@1?value=1500000000000000000`)
  })

  it('builds an ERC-20 transfer URI using the token decimals', () => {
    const { result } = renderHook(() => useRequestAmount())

    act(() => result.current.selectToken(USDC))
    act(() => result.current.handleAmountChange('20'))

    expect(result.current.selectedToken.symbol).toBe('USDC')
    expect(result.current.eip681Uri).toBe(`ethereum:${USDC}@1/transfer?address=${SAFE_ADDRESS}&uint256=20000000`)
  })

  it('rejects keystrokes beyond the token decimals', () => {
    const { result } = renderHook(() => useRequestAmount())

    act(() => result.current.selectToken(USDC))
    act(() => result.current.handleAmountChange('1.1234567'))

    expect(result.current.amount).toBe('')
    expect(result.current.eip681Uri).toBe(`ethereum:${USDC}@1/transfer?address=${SAFE_ADDRESS}`)
  })

  it('truncates the typed amount when switching to a token with fewer decimals', () => {
    const { result } = renderHook(() => useRequestAmount())

    act(() => result.current.handleAmountChange('1.1234567'))
    expect(result.current.eip681Uri).toBe(`ethereum:${SAFE_ADDRESS}@1?value=1123456700000000000`)

    act(() => result.current.selectToken(USDC))

    // The input and the encoded URI stay in sync: both carry the truncated amount.
    expect(result.current.amount).toBe('1.123456')
    expect(result.current.eip681Uri).toBe(`ethereum:${USDC}@1/transfer?address=${SAFE_ADDRESS}&uint256=1123456`)
  })

  it('keeps the typed amount when switching to a token with enough decimals', () => {
    const { result } = renderHook(() => useRequestAmount())

    act(() => result.current.selectToken(USDC))
    act(() => result.current.handleAmountChange('1.25'))
    act(() => result.current.selectToken('native'))

    expect(result.current.amount).toBe('1.25')
    expect(result.current.eip681Uri).toBe(`ethereum:${SAFE_ADDRESS}@1?value=1250000000000000000`)
  })

  it('offers only the native token when balances are unavailable (counterfactual account)', () => {
    mockBalances.mockReturnValue({ visibleItems: undefined })
    const { result } = renderHook(() => useRequestAmount())

    expect(result.current.tokenOptions).toHaveLength(1)
    expect(result.current.tokenOptions[0].symbol).toBe('ETH')
    expect(result.current.eip681Uri).toBe(`ethereum:${SAFE_ADDRESS}@1`)
  })

  it('falls back to sane native defaults when the chain config is missing', () => {
    mockChain.mockReturnValue(undefined)
    mockBalances.mockReturnValue({ visibleItems: undefined })
    const { result } = renderHook(() => useRequestAmount())

    expect(result.current.selectedToken).toEqual(expect.objectContaining({ symbol: 'ETH', decimals: 18 }))
    expect(result.current.selectedToken.tokenAddress).toBeUndefined()
  })
})
