import React from 'react'
import { render } from '@/src/tests/test-utils'
import { PayRequestRedirect, INVALID_PAYMENT_LINK_MESSAGE, NO_ACCOUNT_PAYMENT_LINK_MESSAGE } from './PayRequestRedirect'
import type { SafeInfo } from '@/src/types/address'

const RECIPIENT = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const SAFE_ADDRESS = '0x1111111111111111111111111111111111111111' as `0x${string}`

const mockReplace = jest.fn()
const mockDismissTo = jest.fn()
const mockParams: jest.Mock<{ uri?: string }> = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, dismissTo: mockDismissTo }),
  useLocalSearchParams: () => mockParams(),
}))

const mockShow = jest.fn()
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockShow }),
}))

const activeSafe: SafeInfo = { address: SAFE_ADDRESS, chainId: '1' }

const renderWithSafe = (safe: SafeInfo | null) =>
  render(<PayRequestRedirect />, {
    initialStore: {
      activeSafe: safe,
    },
  })

describe('PayRequestRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('routes a valid payment link into the Send flow with prefill', () => {
    mockParams.mockReturnValue({ uri: `ethereum:${RECIPIENT}@1?value=1000` })

    renderWithSafe(activeSafe)

    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/(send)/recipient',
        params: expect.objectContaining({ scannedAddress: RECIPIENT, prefillValueRaw: '1000' }),
      }),
    )
    expect(mockShow).not.toHaveBeenCalled()
  })

  it('routes a donation payment link (EURe token transfer on Gnosis) with token and amount prefill', () => {
    // Donacijski EIP-681 s domovina.ai stranice (airkuna A2): EURe@100,
    // wei = centi × 1e16 (25,00 EUR = 2500 centi).
    const EURE = '0x420CA0f9B9b604cE0fd9C18EF134C705e5Fa3430'
    const CAMPAIGN_SAFE = '0x2222222222222222222222222222222222222222'
    mockParams.mockReturnValue({
      uri: `ethereum:${EURE}@100/transfer?address=${CAMPAIGN_SAFE}&uint256=25000000000000000000`,
    })

    renderWithSafe(activeSafe)

    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/(send)/recipient',
        params: expect.objectContaining({
          scannedAddress: CAMPAIGN_SAFE,
          prefillTokenAddress: EURE,
          prefillValueRaw: '25000000000000000000',
        }),
      }),
    )
    expect(mockShow).not.toHaveBeenCalled()
  })

  it('shows an error and goes home for an invalid link', () => {
    mockParams.mockReturnValue({ uri: 'ethereum:not-an-address' })

    renderWithSafe(activeSafe)

    expect(mockShow).toHaveBeenCalledWith(INVALID_PAYMENT_LINK_MESSAGE, expect.anything())
    expect(mockReplace).toHaveBeenCalledWith('/')
  })

  it('goes home for a missing uri param', () => {
    mockParams.mockReturnValue({})

    renderWithSafe(activeSafe)

    expect(mockShow).toHaveBeenCalledWith(INVALID_PAYMENT_LINK_MESSAGE, expect.anything())
    expect(mockReplace).toHaveBeenCalledWith('/')
  })

  it('explains and goes home when there is no active safe to send from', () => {
    mockParams.mockReturnValue({ uri: `ethereum:${RECIPIENT}@1?value=1000` })

    renderWithSafe(null)

    expect(mockShow).toHaveBeenCalledWith(NO_ACCOUNT_PAYMENT_LINK_MESSAGE, expect.anything())
    expect(mockReplace).toHaveBeenCalledWith('/')
    expect(mockDismissTo).not.toHaveBeenCalled()
  })
})
