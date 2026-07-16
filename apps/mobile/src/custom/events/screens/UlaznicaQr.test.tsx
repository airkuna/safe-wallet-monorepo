import React from 'react'
import { render } from '@/src/tests/test-utils'
import { UlaznicaQr } from './UlaznicaQr'
import { evStrings } from '../strings'
import { testEvent } from './testEvent'
import type { EventConfig } from '../catalog/types'
import { addTicketOrder, applyBackendSync, clearTicketOrdersForTesting, type TicketOrder } from '../state/useTickets'

const TOKEN = 'ab'.repeat(32)

let mockEvent: EventConfig = testEvent()

const mockParams: jest.Mock<Record<string, string | undefined>> = jest.fn(() => ({}))
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams(),
}))

jest.mock('../catalog/registry', () => ({
  getEvent: () => mockEvent,
  getTier: (event: EventConfig, tierId: string | undefined) => event.tiers.find((tier) => tier.id === tierId),
}))

const baseOrder = (): TicketOrder => ({
  id: 'order-1',
  reference: 'REF-1',
  eventSlug: 'test-conf',
  tierId: 'regular',
  quantity: 1,
  holders: [{ fullName: 'Ana Anić' }],
  totals: { unitEur: '149.00', totalEur: '149.00' },
  currencySymbol: 'EUR',
  status: 'paid-unverified',
  createdAtMs: 1_700_000_000_000,
  backendOrderId: 'b-1',
})

describe('UlaznicaQr', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    clearTicketOrdersForTesting()
    mockEvent = testEvent()
    mockParams.mockReturnValue({ order: 'order-1', serial: 'MOM-000001' })
  })

  it('renders the QR with the holder name for a delivered ticket', () => {
    addTicketOrder(baseOrder())
    applyBackendSync('order-1', {
      backendState: 'paid',
      tickets: [{ serial: 'MOM-000001', holderName: 'Ana Anić', state: 'issued', qrToken: TOKEN }],
    })

    const { getByTestId, queryByTestId } = render(<UlaznicaQr />)
    expect(getByTestId('ev-qr-holder')).toHaveTextContent('Ana Anić')
    expect(getByTestId('ev-qr-code')).toBeTruthy()
    expect(queryByTestId('ev-qr-undelivered')).toBeNull()
    expect(queryByTestId('ev-qr-state-note')).toBeNull()
  })

  it('shows the bearer label when the ticket is not named', () => {
    addTicketOrder(baseOrder())
    applyBackendSync('order-1', {
      backendState: 'paid',
      tickets: [{ serial: 'MOM-000001', state: 'issued', qrToken: TOKEN }],
    })

    const { getByTestId } = render(<UlaznicaQr />)
    expect(getByTestId('ev-qr-holder')).toHaveTextContent(evStrings.qr.holderUnnamed)
  })

  it('explains when the QR token was never delivered to this device', () => {
    addTicketOrder(baseOrder())
    applyBackendSync('order-1', {
      backendState: 'paid',
      tickets: [{ serial: 'MOM-000001', holderName: 'Ana Anić', state: 'issued' }],
    })

    const { getByTestId, queryByTestId } = render(<UlaznicaQr />)
    expect(getByTestId('ev-qr-undelivered')).toBeTruthy()
    expect(queryByTestId('ev-qr-code')).toBeNull()
  })

  it('flags an already used ticket', () => {
    addTicketOrder(baseOrder())
    applyBackendSync('order-1', {
      backendState: 'paid',
      tickets: [{ serial: 'MOM-000001', holderName: 'Ana Anić', state: 'checked_in', qrToken: TOKEN }],
    })

    const { getByTestId } = render(<UlaznicaQr />)
    expect(getByTestId('ev-qr-state-note')).toHaveTextContent(evStrings.qr.stateNote.checked_in)
  })

  it('handles unknown order/serial params gracefully', () => {
    mockParams.mockReturnValue({ order: 'nope', serial: 'nope' })
    const { getByTestId } = render(<UlaznicaQr />)
    expect(getByTestId('ev-qr-missing')).toBeTruthy()
  })
})
