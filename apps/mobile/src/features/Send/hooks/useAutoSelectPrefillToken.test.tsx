import { renderHook } from '@/src/tests/test-utils'
import type { Balance } from '@safe-global/store/gateway/AUTO_GENERATED/balances'
import { useAutoSelectPrefillToken, PREFILL_TOKEN_UNAVAILABLE_MESSAGE } from './useAutoSelectPrefillToken'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F'

const mockShow = jest.fn()
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockShow }),
}))

const makeBalance = (address: string, type: Balance['tokenInfo']['type']): Balance => ({
  balance: '1000000000000000000',
  fiatBalance: '1',
  fiatConversion: '1',
  tokenInfo: {
    address,
    decimals: 18,
    logoUri: '',
    name: 'Token',
    symbol: 'TKN',
    type,
  },
})

describe('useAutoSelectPrefillToken', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('does nothing without a prefill token', () => {
    const onSelect = jest.fn()
    renderHook(() =>
      useAutoSelectPrefillToken({ prefillTokenAddress: undefined, items: [], isLoading: false, onSelect }),
    )

    expect(onSelect).not.toHaveBeenCalled()
    expect(mockShow).not.toHaveBeenCalled()
  })

  it('waits for balances to finish loading', () => {
    const onSelect = jest.fn()
    renderHook(() =>
      useAutoSelectPrefillToken({ prefillTokenAddress: DAI, items: undefined, isLoading: true, onSelect }),
    )

    expect(onSelect).not.toHaveBeenCalled()
    expect(mockShow).not.toHaveBeenCalled()
  })

  it('selects a held ERC-20 token matching the prefill (case-insensitively)', () => {
    const onSelect = jest.fn()
    renderHook(() =>
      useAutoSelectPrefillToken({
        prefillTokenAddress: DAI.toLowerCase(),
        items: [makeBalance(ZERO_ADDRESS, 'NATIVE_TOKEN'), makeBalance(DAI, 'ERC20')],
        isLoading: false,
        onSelect,
      }),
    )

    expect(onSelect).toHaveBeenCalledWith(DAI)
  })

  it('maps the zero-address sentinel to the native token', () => {
    const onSelect = jest.fn()
    renderHook(() =>
      useAutoSelectPrefillToken({
        prefillTokenAddress: ZERO_ADDRESS,
        items: [makeBalance(DAI, 'ERC20'), makeBalance(ZERO_ADDRESS, 'NATIVE_TOKEN')],
        isLoading: false,
        onSelect,
      }),
    )

    expect(onSelect).toHaveBeenCalledWith(ZERO_ADDRESS)
  })

  it('warns instead of selecting when the requested token is not held', () => {
    const onSelect = jest.fn()
    renderHook(() =>
      useAutoSelectPrefillToken({
        prefillTokenAddress: DAI,
        items: [makeBalance(ZERO_ADDRESS, 'NATIVE_TOKEN')],
        isLoading: false,
        onSelect,
      }),
    )

    expect(onSelect).not.toHaveBeenCalled()
    expect(mockShow).toHaveBeenCalledWith(PREFILL_TOKEN_UNAVAILABLE_MESSAGE, expect.anything())
  })

  it('consumes the prefill only once per mount', () => {
    const onSelect = jest.fn()
    const items = [makeBalance(DAI, 'ERC20')]
    const { rerender } = renderHook(() =>
      useAutoSelectPrefillToken({ prefillTokenAddress: DAI, items, isLoading: false, onSelect }),
    )

    rerender({})

    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})
