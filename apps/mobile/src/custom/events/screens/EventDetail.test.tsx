import React from 'react'
import { fireEvent, render } from '@/src/tests/test-utils'
import { EventDetail } from './EventDetail'
import { evStrings } from '../strings'
import { testEvent } from './testEvent'
import type { EventConfig, TicketTierConfig } from '../catalog/types'

let mockEvent: EventConfig = testEvent()

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), dismissTo: jest.fn() }),
  useLocalSearchParams: () => ({ event: 'test-conf' }),
}))

jest.mock('../catalog/registry', () => {
  const actual = jest.requireActual<typeof import('../catalog/registry')>('../catalog/registry')
  return {
    getEvent: () => mockEvent,
    isTierOnSale: actual.isTierOnSale,
  }
})

describe('EventDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEvent = testEvent()
  })

  it('shows date, venue, tiers with prices and opens the checkout', () => {
    const { getByTestId, getByText } = render(<EventDetail />)

    expect(getByTestId('ev-detail-date')).toHaveTextContent('10.–11.3.2027. · Testni velesajam, Zagreb')
    expect(getByText('149,00 EUR')).toBeTruthy()

    fireEvent.press(getByTestId('ev-detail-tier-regular'))
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/events/checkout',
      params: { event: 'test-conf', tier: 'regular' },
    })
  })

  it('marks named tiers and shows the organizer block', () => {
    const { getByText } = render(<EventDetail />)

    expect(getByText(evStrings.event.named)).toBeTruthy()
    expect(getByText('Test Org')).toBeTruthy()
  })

  it('shows the inactive note when the event has no safe address', () => {
    mockEvent = testEvent({ safeAddress: undefined })

    const { getByTestId } = render(<EventDetail />)
    expect(getByTestId('ev-detail-inactive')).toBeTruthy()
  })

  it('shows the announced state for events without tiers', () => {
    mockEvent = testEvent({ tiers: [], safeAddress: undefined })

    const { getByTestId, queryByTestId } = render(<EventDetail />)
    expect(getByTestId('ev-detail-no-tiers')).toBeTruthy()
    // Bez tiera nema ni "ne prima plaćanja" note — event je samo najavljen.
    expect(queryByTestId('ev-detail-inactive')).toBeNull()
  })

  it('disables tiers outside the sale window', () => {
    const closedTier: TicketTierConfig = {
      id: 'closed',
      naziv: 'Closed',
      priceEur: '10.00',
      imenska: false,
      saleEndIso: '2000-01-01',
    }
    mockEvent = testEvent({ tiers: [closedTier] })

    const { getByText, getByTestId } = render(<EventDetail />)
    expect(getByText(evStrings.event.saleClosed)).toBeTruthy()

    fireEvent.press(getByTestId('ev-detail-tier-closed'))
    expect(mockPush).not.toHaveBeenCalled()
  })
})
