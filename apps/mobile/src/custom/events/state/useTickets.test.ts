/**
 * Stateful in-memory MMKV fake — globalni jest mock vraća stateless
 * jest.fn()-ove, a ovdje testiramo upravo persistencijsku semantiku
 * (add → read-back → paid update).
 */
const mockMemory = new Map<string, string>()

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: (key: string) => mockMemory.get(key),
    set: (key: string, value: string) => {
      mockMemory.set(key, value)
    },
    remove: (key: string) => {
      mockMemory.delete(key)
    },
  }),
}))

import { renderHook, act } from '@testing-library/react-native'
import {
  addTicketOrder,
  clearTicketOrdersForTesting,
  markTicketOrderPaid,
  useTicketOrders,
  type TicketOrder,
} from './useTickets'

const makeOrder = (id: string): TicketOrder => ({
  id,
  reference: `MON-${id}`,
  eventSlug: 'money-motion-2027',
  tierId: 'super-early-bird',
  quantity: 1,
  holders: [{ fullName: 'Ana Anić' }],
  totals: { unitEur: '149.00', totalEur: '149.00' },
  currencySymbol: 'EURe',
  status: 'pending',
  createdAtMs: 1,
})

describe('useTickets', () => {
  beforeEach(() => {
    clearTicketOrdersForTesting()
  })

  it('starts empty and persists added orders newest-first', () => {
    const { result } = renderHook(() => useTicketOrders())
    expect(result.current).toEqual([])

    act(() => {
      addTicketOrder(makeOrder('a'))
      addTicketOrder(makeOrder('b'))
    })

    expect(result.current.map((order) => order.id)).toEqual(['b', 'a'])
  })

  it('marks a single order paid with the tx hash', () => {
    const { result } = renderHook(() => useTicketOrders())

    act(() => {
      addTicketOrder(makeOrder('a'))
      addTicketOrder(makeOrder('b'))
      markTicketOrderPaid('a', '0xabc')
    })

    const paid = result.current.find((order) => order.id === 'a')
    expect(paid?.status).toBe('paid-unverified')
    expect(paid?.txHash).toBe('0xabc')
    expect(result.current.find((order) => order.id === 'b')?.status).toBe('pending')
  })

  it('keeps a referentially stable snapshot between renders', () => {
    const { result, rerender } = renderHook(() => useTicketOrders())

    act(() => {
      addTicketOrder(makeOrder('a'))
    })

    const first = result.current
    rerender({})
    expect(result.current).toBe(first)
  })
})
