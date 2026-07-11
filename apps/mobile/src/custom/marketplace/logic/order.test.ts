import {
  buildOrderReference,
  centsToEur,
  composeOrderMessage,
  eurToCents,
  formatEur,
  isBuyerComplete,
  orderTotals,
  toBaseUnits,
  type BuyerInfo,
  type OrderItem,
} from './order'
import type { MerchantConfig } from '../catalog/types'

describe('eurToCents / centsToEur', () => {
  it.each([
    ['64.90', 6490],
    ['64,90', 6490],
    ['65', 6500],
    ['0.5', 50],
    ['0', 0],
  ])('parses %s to %i cents', (input, expected) => {
    expect(eurToCents(input)).toBe(expected)
  })

  it.each(['', 'abc', '-5', '1.234', '12.', '.90'])('rejects %s', (input) => {
    expect(eurToCents(input)).toBeNull()
  })

  it('round-trips through centsToEur', () => {
    expect(centsToEur(6490)).toBe('64.90')
    expect(centsToEur(6500)).toBe('65.00')
    expect(centsToEur(5)).toBe('0.05')
  })
})

describe('formatEur', () => {
  it('formats with Croatian separators', () => {
    expect(formatEur('1264.90')).toBe('1.264,90')
    expect(formatEur('64.9')).toBe('64,90')
    expect(formatEur('7')).toBe('7,00')
  })
})

describe('orderTotals', () => {
  const item = (priceEur: string, qty: number): OrderItem => ({
    productId: 'p1',
    name: 'Košulja',
    size: 'L',
    qty,
    priceEur,
  })

  it('sums items and adds flat shipping', () => {
    expect(orderTotals([item('64.90', 2)], { flatEur: '4.50' })).toEqual({
      itemsEur: '129.80',
      shippingEur: '4.50',
      totalEur: '134.30',
    })
  })

  it('waives shipping above the free threshold', () => {
    expect(orderTotals([item('64.90', 2)], { flatEur: '4.50', freeAboveEur: '100' })).toEqual({
      itemsEur: '129.80',
      shippingEur: '0.00',
      totalEur: '129.80',
    })
  })

  it('has no shipping when merchant defines none', () => {
    expect(orderTotals([item('10', 1)])).toEqual({ itemsEur: '10.00', shippingEur: '0.00', totalEur: '10.00' })
  })

  it('returns null for empty carts, bad prices and bad quantities', () => {
    expect(orderTotals([], { flatEur: '4.50' })).toBeNull()
    expect(orderTotals([item('abc', 1)])).toBeNull()
    expect(orderTotals([item('10', 0)])).toBeNull()
    expect(orderTotals([item('10', 1.5)])).toBeNull()
    expect(orderTotals([item('10', 1)], { flatEur: 'x' })).toBeNull()
  })
})

describe('toBaseUnits', () => {
  it('converts decimal strings without float drift', () => {
    expect(toBaseUnits('129.80', 18)).toBe('129800000000000000000')
    expect(toBaseUnits('12,5', 18)).toBe('12500000000000000000')
  })

  it('rejects non-positive and malformed amounts', () => {
    expect(toBaseUnits('', 18)).toBeNull()
    expect(toBaseUnits('0', 18)).toBeNull()
    expect(toBaseUnits('1.2345', 2)).toBeNull()
    expect(toBaseUnits('-4', 18)).toBeNull()
  })
})

describe('buildOrderReference', () => {
  it('is deterministic with injected time and randomness', () => {
    expect(buildOrderReference('crosulja', 1000000, () => 0.5)).toBe('CRO-LFLS-550')
  })

  it('falls back to ORD when the slug has no letters', () => {
    expect(buildOrderReference('123', 1000000, () => 0)).toBe('ORD-LFLS-100')
  })
})

describe('isBuyerComplete', () => {
  const buyer: BuyerInfo = {
    fullName: 'Ivan Horvat',
    street: 'Ilica 1',
    postalCodeAndCity: '10000 Zagreb',
    email: 'ivan@example.com',
  }

  it('accepts a complete buyer and rejects blank required fields', () => {
    expect(isBuyerComplete(buyer)).toBe(true)
    expect(isBuyerComplete({ ...buyer, email: '  ' })).toBe(false)
  })
})

describe('composeOrderMessage', () => {
  const merchant: MerchantConfig = {
    slug: 'crosulja',
    name: 'Crošulja',
    brand: { primaryHex: '#AA1122', accentHex: '#FFFFFF' },
    products: [],
  }

  it('includes items, totals, buyer and payer address', () => {
    const message = composeOrderMessage({
      reference: 'CRO-X-1',
      merchant,
      items: [{ productId: 'p1', name: 'Model A', size: 'L', qty: 2, priceEur: '64.90' }],
      buyer: {
        fullName: 'Ivan Horvat',
        street: 'Ilica 1',
        postalCodeAndCity: '10000 Zagreb',
        email: 'ivan@example.com',
        phone: '0911234567',
      },
      totals: { itemsEur: '129.80', shippingEur: '0.00', totalEur: '129.80' },
      currencySymbol: 'EURe',
      payerSafeAddress: '0x1111111111111111111111111111111111111111',
    })

    expect(message).toContain('Narudžba CRO-X-1 — Crošulja')
    expect(message).toContain('• Model A — veličina L × 2 — 64,90 EUR/kom')
    expect(message).toContain('Ukupno: 129,80 EUR (plaćeno u EURe)')
    expect(message).toContain('10000 Zagreb')
    expect(message).toContain('Telefon: 0911234567')
    expect(message).toContain('Plaćeno s računa: 0x1111111111111111111111111111111111111111')
  })
})
