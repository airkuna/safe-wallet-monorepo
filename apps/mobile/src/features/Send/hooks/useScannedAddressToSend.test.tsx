import { act, renderHook } from '@/src/tests/test-utils'
import { useScannedAddressToSend } from './useScannedAddressToSend'

const VALID_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

const mockReplace = jest.fn()
const mockDismissTo = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, dismissTo: mockDismissTo }),
}))

const mockShow = jest.fn()
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockShow }),
}))

const mockActiveChain = jest.fn()
jest.mock('@/src/store/chains', () => ({
  ...jest.requireActual('@/src/store/chains'),
  selectActiveChain: () => mockActiveChain(),
}))

describe('useScannedAddressToSend', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockActiveChain.mockReturnValue(undefined)
  })

  it('navigates to the recipient with dismissTo by default', () => {
    const { result } = renderHook(() => useScannedAddressToSend())

    act(() => result.current.navigateToRecipient(VALID_ADDRESS))

    expect(mockDismissTo).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/(send)/recipient',
        params: expect.objectContaining({ scannedAddress: VALID_ADDRESS }),
      }),
    )
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('navigates with replace when asked', () => {
    const { result } = renderHook(() => useScannedAddressToSend())

    act(() => result.current.navigateToRecipient(VALID_ADDRESS, 'replace'))

    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/(send)/recipient',
        params: expect.objectContaining({ scannedAddress: VALID_ADDRESS }),
      }),
    )
    expect(mockDismissTo).not.toHaveBeenCalled()
  })

  it('warns when the scanned prefix does not match the active chain', () => {
    mockActiveChain.mockReturnValue({ shortName: 'eth' })
    const { result } = renderHook(() => useScannedAddressToSend())

    act(() => result.current.warnChainMismatch('gno'))

    expect(mockShow).toHaveBeenCalledWith(expect.stringContaining('gno'), expect.anything())
  })

  it('does not warn when the prefix matches the active chain or is absent', () => {
    mockActiveChain.mockReturnValue({ shortName: 'eth' })
    const { result } = renderHook(() => useScannedAddressToSend())

    act(() => result.current.warnChainMismatch('eth'))
    act(() => result.current.warnChainMismatch(undefined))

    expect(mockShow).not.toHaveBeenCalled()
  })

  describe('sendPaymentRequestToRecipient', () => {
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
    const TOKEN = '0x6B175474E89094C44Da98b954EedeAC495271d0F'

    it('prefills token and amount when the request matches the active chain', () => {
      mockActiveChain.mockReturnValue({ chainId: '1', chainName: 'Ethereum', shortName: 'eth' })
      const { result } = renderHook(() => useScannedAddressToSend())

      act(() =>
        result.current.sendPaymentRequestToRecipient({
          recipient: VALID_ADDRESS,
          chainId: '1',
          tokenAddress: TOKEN,
          value: '5000000',
        }),
      )

      expect(mockDismissTo).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: '/(send)/recipient',
          params: expect.objectContaining({
            scannedAddress: VALID_ADDRESS,
            prefillTokenAddress: TOKEN,
            prefillValueRaw: '5000000',
          }),
        }),
      )
      expect(mockShow).not.toHaveBeenCalled()
    })

    it('uses the zero-address native sentinel for native requests', () => {
      mockActiveChain.mockReturnValue({ chainId: '1', chainName: 'Ethereum', shortName: 'eth' })
      const { result } = renderHook(() => useScannedAddressToSend())

      act(() => result.current.sendPaymentRequestToRecipient({ recipient: VALID_ADDRESS, chainId: '1', value: '1000' }))

      expect(mockDismissTo).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ prefillTokenAddress: ZERO_ADDRESS, prefillValueRaw: '1000' }),
        }),
      )
    })

    it('warns and drops token/amount prefill on a chain mismatch, keeping the address', () => {
      mockActiveChain.mockReturnValue({ chainId: '1', chainName: 'Ethereum', shortName: 'eth' })
      const { result } = renderHook(() => useScannedAddressToSend())

      act(() =>
        result.current.sendPaymentRequestToRecipient({
          recipient: VALID_ADDRESS,
          chainId: '100',
          tokenAddress: TOKEN,
          value: '5000000',
        }),
      )

      expect(mockShow).toHaveBeenCalledWith(expect.stringContaining('100'), expect.anything())
      const target = mockDismissTo.mock.calls[0][0]
      expect(target.params.scannedAddress).toBe(VALID_ADDRESS)
      expect(target.params.prefillTokenAddress).toBeUndefined()
      expect(target.params.prefillValueRaw).toBeUndefined()
    })

    it('treats a bare address URI (no token, no amount) as a plain address scan', () => {
      mockActiveChain.mockReturnValue({ chainId: '1', chainName: 'Ethereum', shortName: 'eth' })
      const { result } = renderHook(() => useScannedAddressToSend())

      act(() => result.current.sendPaymentRequestToRecipient({ recipient: VALID_ADDRESS, chainId: '1' }))

      expect(mockShow).not.toHaveBeenCalled()
      const target = mockDismissTo.mock.calls[0][0]
      expect(target.params.scannedAddress).toBe(VALID_ADDRESS)
      expect(target.params.prefillTokenAddress).toBeUndefined()
      expect(target.params.prefillValueRaw).toBeUndefined()
    })

    it('still prefills the token when the request has a token but no amount', () => {
      mockActiveChain.mockReturnValue({ chainId: '1', chainName: 'Ethereum', shortName: 'eth' })
      const { result } = renderHook(() => useScannedAddressToSend())

      act(() =>
        result.current.sendPaymentRequestToRecipient({ recipient: VALID_ADDRESS, chainId: '1', tokenAddress: TOKEN }),
      )

      const target = mockDismissTo.mock.calls[0][0]
      expect(target.params.prefillTokenAddress).toBe(TOKEN)
      expect(target.params.prefillValueRaw).toBeUndefined()
    })

    it('prefills when the request carries no chain id', () => {
      mockActiveChain.mockReturnValue({ chainId: '1', chainName: 'Ethereum', shortName: 'eth' })
      const { result } = renderHook(() => useScannedAddressToSend())

      act(() => result.current.sendPaymentRequestToRecipient({ recipient: VALID_ADDRESS, value: '7' }, 'replace'))

      expect(mockReplace).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ prefillTokenAddress: ZERO_ADDRESS, prefillValueRaw: '7' }),
        }),
      )
    })
  })

  describe('sendScannedToRecipient', () => {
    it('routes a payment request through the prefill path', () => {
      mockActiveChain.mockReturnValue({ chainId: '1', chainName: 'Ethereum', shortName: 'eth' })
      const { result } = renderHook(() => useScannedAddressToSend())

      act(() =>
        result.current.sendScannedToRecipient({
          address: VALID_ADDRESS,
          paymentRequest: { recipient: VALID_ADDRESS, chainId: '1', value: '9' },
        }),
      )

      expect(mockDismissTo).toHaveBeenCalledWith(
        expect.objectContaining({ params: expect.objectContaining({ prefillValueRaw: '9' }) }),
      )
    })

    it('keeps the plain-address behaviour for non-payment scans', () => {
      mockActiveChain.mockReturnValue({ chainId: '1', chainName: 'Ethereum', shortName: 'eth' })
      const { result } = renderHook(() => useScannedAddressToSend())

      act(() => result.current.sendScannedToRecipient({ address: VALID_ADDRESS, prefix: 'gno' }))

      expect(mockShow).toHaveBeenCalledWith(expect.stringContaining('gno'), expect.anything())
      const target = mockDismissTo.mock.calls[0][0]
      expect(target.params.prefillTokenAddress).toBeUndefined()
      expect(target.params.prefillValueRaw).toBeUndefined()
    })
  })
})
