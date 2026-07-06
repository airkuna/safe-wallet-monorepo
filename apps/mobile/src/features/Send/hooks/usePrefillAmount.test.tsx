import { renderHook } from '@/src/tests/test-utils'
import { usePrefillAmount } from './usePrefillAmount'

describe('usePrefillAmount', () => {
  it('does nothing without a prefill value', () => {
    const setAmount = jest.fn()
    renderHook(() => usePrefillAmount({ prefillValueRaw: undefined, decimals: 18, isTokenDataReady: true, setAmount }))

    expect(setAmount).not.toHaveBeenCalled()
  })

  it('waits until the token data (decimals) is ready', () => {
    const setAmount = jest.fn()
    renderHook(() =>
      usePrefillAmount({ prefillValueRaw: '1000000000000000000', decimals: 18, isTokenDataReady: false, setAmount }),
    )

    expect(setAmount).not.toHaveBeenCalled()
  })

  it('converts base units to a human amount and trims trailing zeros', () => {
    const setAmount = jest.fn()
    renderHook(() =>
      usePrefillAmount({ prefillValueRaw: '1500000000000000000', decimals: 18, isTokenDataReady: true, setAmount }),
    )

    expect(setAmount).toHaveBeenCalledWith('1.5', 18)
  })

  it('renders whole amounts without a decimal point', () => {
    const setAmount = jest.fn()
    renderHook(() => usePrefillAmount({ prefillValueRaw: '5000000', decimals: 6, isTokenDataReady: true, setAmount }))

    expect(setAmount).toHaveBeenCalledWith('5', 6)
  })

  it('ignores a zero amount', () => {
    const setAmount = jest.fn()
    renderHook(() => usePrefillAmount({ prefillValueRaw: '0', decimals: 18, isTokenDataReady: true, setAmount }))

    expect(setAmount).not.toHaveBeenCalled()
  })

  it('ignores a malformed amount instead of throwing', () => {
    const setAmount = jest.fn()
    renderHook(() =>
      usePrefillAmount({ prefillValueRaw: 'not-a-number', decimals: 18, isTokenDataReady: true, setAmount }),
    )

    expect(setAmount).not.toHaveBeenCalled()
  })

  it('applies the prefill only once per mount', () => {
    const setAmount = jest.fn()
    const { rerender } = renderHook(() =>
      usePrefillAmount({ prefillValueRaw: '1000000', decimals: 6, isTokenDataReady: true, setAmount }),
    )

    rerender({})

    expect(setAmount).toHaveBeenCalledTimes(1)
  })
})
