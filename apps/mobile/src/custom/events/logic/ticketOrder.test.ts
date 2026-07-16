import {
  DEFAULT_MAX_PER_ORDER,
  buildTicketReference,
  composeTicketOrderMessage,
  eurToCents,
  formatEur,
  formatEventDate,
  holdersComplete,
  ticketTotals,
  toBaseUnits,
} from './ticketOrder'
import { testEvent } from '../screens/testEvent'
import type { TicketTierConfig } from '../catalog/types'

const namedTier: TicketTierConfig = { id: 'regular', naziv: 'Regular', priceEur: '149.00', imenska: true }
const openTier: TicketTierConfig = { id: 'fan', naziv: 'Fan', priceEur: '20.00', imenska: false }

describe('eurToCents / formatEur', () => {
  it('parses dot, comma and integer forms', () => {
    expect(eurToCents('149.00')).toBe(14900)
    expect(eurToCents('149,00')).toBe(14900)
    expect(eurToCents('149')).toBe(14900)
    expect(eurToCents('0.5')).toBe(50)
  })

  it('rejects garbage, negatives and >2 decimals', () => {
    expect(eurToCents('')).toBeNull()
    expect(eurToCents('-1')).toBeNull()
    expect(eurToCents('1.234')).toBeNull()
    expect(eurToCents('abc')).toBeNull()
  })

  it('formats croatian style with thousands separator', () => {
    expect(formatEur('1264.90')).toBe('1.264,90')
    expect(formatEur('149.00')).toBe('149,00')
  })
})

describe('ticketTotals', () => {
  it('multiplies unit price by quantity in cents', () => {
    expect(ticketTotals(namedTier, 2)).toEqual({ unitEur: '149.00', totalEur: '298.00' })
  })

  it('rejects non-positive, non-integer and over-limit quantities', () => {
    expect(ticketTotals(namedTier, 0)).toBeNull()
    expect(ticketTotals(namedTier, 1.5)).toBeNull()
    expect(ticketTotals(namedTier, DEFAULT_MAX_PER_ORDER + 1)).toBeNull()
    expect(ticketTotals({ ...namedTier, maxPoNarudzbi: 2 }, 3)).toBeNull()
  })

  it('rejects unparsable prices (null keeps the CTA disabled)', () => {
    expect(ticketTotals({ ...namedTier, priceEur: 'uskoro' }, 1)).toBeNull()
  })
})

describe('toBaseUnits', () => {
  it('converts exact decimal strings without float drift', () => {
    expect(toBaseUnits('298.00', 18)).toBe('298000000000000000000')
    expect(toBaseUnits('0.5', 18)).toBe('500000000000000000')
  })

  it('rejects zero, empty and too many decimals', () => {
    expect(toBaseUnits('0', 18)).toBeNull()
    expect(toBaseUnits('', 18)).toBeNull()
    expect(toBaseUnits('1.123', 2)).toBeNull()
  })
})

describe('holdersComplete', () => {
  it('requires a full name per ticket for named tiers', () => {
    expect(holdersComplete(namedTier, [{ fullName: 'Ana Anić' }, { fullName: 'Ivo Ivić' }], 2)).toBe(true)
    expect(holdersComplete(namedTier, [{ fullName: 'Ana Anić' }, { fullName: '  ' }], 2)).toBe(false)
    expect(holdersComplete(namedTier, [{ fullName: 'Ana Anić' }], 2)).toBe(false)
  })

  it('ignores holders for non-named tiers', () => {
    expect(holdersComplete(openTier, [], 3)).toBe(true)
  })

  it('only validates the first qty holders', () => {
    expect(holdersComplete(namedTier, [{ fullName: 'Ana Anić' }, { fullName: '' }], 1)).toBe(true)
  })
})

describe('buildTicketReference', () => {
  it('is deterministic with injected time and randomness', () => {
    expect(buildTicketReference('money-motion-2027', 1000, () => 0)).toBe('MON-RS-100')
  })

  it('falls back to EVT for slugs without letters', () => {
    expect(buildTicketReference('2027', 1000, () => 0)).toBe('EVT-RS-100')
  })
})

describe('formatEventDate', () => {
  it('formats single day, same-month range and cross-month range', () => {
    expect(formatEventDate('2027-03-10')).toBe('10.3.2027.')
    expect(formatEventDate('2027-03-10', '2027-03-10')).toBe('10.3.2027.')
    expect(formatEventDate('2027-03-10', '2027-03-11')).toBe('10.–11.3.2027.')
    expect(formatEventDate('2027-03-30', '2027-04-02')).toBe('30.3.–2.4.2027.')
    expect(formatEventDate('2027-12-30', '2028-01-02')).toBe('30.12.2027.–2.1.2028.')
  })

  it('returns empty string for missing or unparsable dates', () => {
    expect(formatEventDate(undefined)).toBe('')
    expect(formatEventDate('ožujak')).toBe('')
  })
})

describe('composeTicketOrderMessage', () => {
  it('includes reference, tier, holders, total and payment trail', () => {
    const message = composeTicketOrderMessage({
      reference: 'MON-X-1',
      event: testEvent(),
      tier: namedTier,
      quantity: 2,
      holders: [{ fullName: 'Ana Anić', email: 'ana@example.com' }, { fullName: 'Ivo Ivić' }],
      totals: { unitEur: '149.00', totalEur: '298.00' },
      currencySymbol: 'EURe',
      payerSafeAddress: '0x1111111111111111111111111111111111111111',
      txHash: '0xabc',
    })

    expect(message).toContain('MON-X-1')
    expect(message).toContain('Regular × 2')
    expect(message).toContain('298,00 EUR')
    expect(message).toContain('1. Ana Anić (ana@example.com)')
    expect(message).toContain('2. Ivo Ivić')
    expect(message).toContain('0x1111111111111111111111111111111111111111')
    expect(message).toContain('0xabc')
  })

  it('omits the holder section for non-named tiers', () => {
    const message = composeTicketOrderMessage({
      reference: 'MON-X-2',
      event: testEvent(),
      tier: openTier,
      quantity: 3,
      holders: [],
      totals: { unitEur: '20.00', totalEur: '60.00' },
      currencySymbol: 'EURe',
    })

    expect(message).toContain('Fan × 3')
    expect(message).not.toContain('glase na')
  })
})
