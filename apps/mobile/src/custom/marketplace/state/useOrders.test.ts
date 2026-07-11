/**
 * Stateful in-memory MMKV fake — globalni jest mock vraća stateless
 * jest.fn()-ove, a ovdje testiramo upravo persistencijsku semantiku
 * (add → read-back → update statusa).
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
import { addOrder, clearOrdersForTesting, setOrderStatus, useOrders, type Order } from './useOrders'

const makeOrder = (id: string): Order => ({
  id,
  reference: `CRO-${id}`,
  merchantSlug: 'crosulja',
  items: [{ productId: 'p1', name: 'Model A', size: 'L', qty: 1, priceEur: '64.90' }],
  buyer: { fullName: 'Ivan Horvat', street: 'Ilica 1', postalCodeAndCity: '10000 Zagreb', email: 'ivan@example.com' },
  totals: { itemsEur: '64.90', shippingEur: '0.00', totalEur: '64.90' },
  currencySymbol: 'EURe',
  status: 'pending',
  createdAtMs: 1,
})

describe('useOrders', () => {
  beforeEach(() => {
    clearOrdersForTesting()
  })

  it('starts empty and persists added orders newest-first', () => {
    const { result } = renderHook(() => useOrders())
    expect(result.current).toEqual([])

    act(() => {
      addOrder(makeOrder('a'))
      addOrder(makeOrder('b'))
    })

    expect(result.current.map((order) => order.id)).toEqual(['b', 'a'])
  })

  it('updates the status of a single order', () => {
    const { result } = renderHook(() => useOrders())

    act(() => {
      addOrder(makeOrder('a'))
      addOrder(makeOrder('b'))
      setOrderStatus('a', 'sent')
    })

    expect(result.current.find((order) => order.id === 'a')?.status).toBe('sent')
    expect(result.current.find((order) => order.id === 'b')?.status).toBe('pending')
  })

  it('keeps a referentially stable snapshot between renders', () => {
    const { result, rerender } = renderHook(() => useOrders())

    act(() => {
      addOrder(makeOrder('a'))
    })

    const first = result.current
    rerender({})
    expect(result.current).toBe(first)
  })
})
