import React from 'react'
import { fireEvent, render } from '@/src/tests/test-utils'
import { TicketCheckout } from './TicketCheckout'
import { evStrings } from '../strings'
import { testEvent, TEST_EVENT_SAFE } from './testEvent'
import type { EventConfig } from '../catalog/types'
import type { SafeInfo } from '@/src/types/address'

const SAFE_ADDRESS = '0x1111111111111111111111111111111111111111' as `0x${string}`

let mockEvent: EventConfig = testEvent()

const mockReplace = jest.fn()
const mockParams: jest.Mock<Record<string, string | undefined>> = jest.fn(() => ({}))
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, dismissTo: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => mockParams(),
}))

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: jest.fn() }),
}))

jest.mock('../catalog/registry', () => ({
  getEvent: () => mockEvent,
  getTier: (event: EventConfig, tierId: string | undefined) => event.tiers.find((tier) => tier.id === tierId),
}))

const mockAddTicketOrder = jest.fn()
jest.mock('../state/useTickets', () => ({
  addTicketOrder: (order: unknown) => mockAddTicketOrder(order),
}))

const activeSafe: SafeInfo = { address: SAFE_ADDRESS, chainId: '100' }

const renderWithSafe = (safe: SafeInfo | null) => render(<TicketCheckout />, { initialStore: { activeSafe: safe } })

describe('TicketCheckout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEvent = testEvent()
    mockParams.mockReturnValue({ event: 'test-conf', tier: 'regular' })
  })

  it('shows the unit price and multiplies the total with the stepper', () => {
    const { getByTestId } = renderWithSafe(activeSafe)

    expect(getByTestId('ev-checkout-total')).toHaveTextContent('149,00 EUR')

    fireEvent.press(getByTestId('ev-checkout-qty-plus'))
    expect(getByTestId('ev-checkout-qty')).toHaveTextContent('2')
    expect(getByTestId('ev-checkout-total')).toHaveTextContent('298,00 EUR')

    fireEvent.press(getByTestId('ev-checkout-qty-minus'))
    fireEvent.press(getByTestId('ev-checkout-qty-minus'))
    expect(getByTestId('ev-checkout-qty')).toHaveTextContent('1')
  })

  it('blocks payment without an active safe', () => {
    const { getByTestId, getByText } = renderWithSafe(null)

    expect(getByText(evStrings.checkout.noActiveAccount)).toBeTruthy()
    fireEvent.changeText(getByTestId('ev-checkout-holder-name-0'), 'Ana Anić')
    fireEvent.press(getByTestId('ev-checkout-pay'))

    expect(mockAddTicketOrder).not.toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('blocks payment when the event has no safe address', () => {
    mockEvent = testEvent({ safeAddress: undefined })

    const { getByTestId, getByText } = renderWithSafe(activeSafe)

    expect(getByText(evStrings.checkout.eventInactive)).toBeTruthy()
    fireEvent.changeText(getByTestId('ev-checkout-holder-name-0'), 'Ana Anić')
    fireEvent.press(getByTestId('ev-checkout-pay'))

    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('blocks payment for named tiers until all holder names are filled', () => {
    const { getByTestId } = renderWithSafe(activeSafe)

    fireEvent.press(getByTestId('ev-checkout-qty-plus'))
    fireEvent.changeText(getByTestId('ev-checkout-holder-name-0'), 'Ana Anić')
    fireEvent.press(getByTestId('ev-checkout-pay'))

    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('does not ask for holders on non-named tiers', () => {
    mockParams.mockReturnValue({ event: 'test-conf', tier: 'fan' })

    const { queryByTestId } = renderWithSafe(activeSafe)
    expect(queryByTestId('ev-checkout-holder-name-0')).toBeNull()
  })

  it('saves the order locally and hands the total to the Send flow as an EIP-681 prefill', () => {
    const { getByTestId } = renderWithSafe(activeSafe)

    fireEvent.press(getByTestId('ev-checkout-qty-plus'))
    fireEvent.changeText(getByTestId('ev-checkout-holder-name-0'), 'Ana Anić')
    fireEvent.changeText(getByTestId('ev-checkout-holder-name-1'), 'Ivo Ivić')
    fireEvent.press(getByTestId('ev-checkout-pay'))

    expect(mockAddTicketOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        eventSlug: 'test-conf',
        tierId: 'regular',
        quantity: 2,
        holders: [expect.objectContaining({ fullName: 'Ana Anić' }), expect.objectContaining({ fullName: 'Ivo Ivić' })],
        totals: { unitEur: '149.00', totalEur: '298.00' },
        payerSafeAddress: SAFE_ADDRESS,
        status: 'pending',
      }),
    )

    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/(send)/recipient',
        params: expect.objectContaining({
          scannedAddress: TEST_EVENT_SAFE,
          // Default valuta: EURe s 18 decimala na Gnosisu.
          prefillTokenAddress: '0xcB444e90D8198415266c6a2724b7900fb12FC56E',
          prefillValueRaw: '298000000000000000000',
        }),
      }),
    )
  })
})
