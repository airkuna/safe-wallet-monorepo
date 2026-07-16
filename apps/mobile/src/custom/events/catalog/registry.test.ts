import { EVENTS, getEvent, getTier, isTierOnSale } from './registry'
import type { TicketTierConfig } from './types'

describe('events registry', () => {
  it('falls back to the first event for unknown slugs (UI never crashes)', () => {
    expect(getEvent(undefined)).toBe(EVENTS[0])
    expect(getEvent('nepostojeci')).toBe(EVENTS[0])
    expect(getEvent(EVENTS[1].slug)).toBe(EVENTS[1])
  })

  it('resolves tiers by id within an event', () => {
    const event = EVENTS[0]
    expect(getTier(event, event.tiers[0].id)).toBe(event.tiers[0])
    expect(getTier(event, 'nepostojeci')).toBeUndefined()
    expect(getTier(event, undefined)).toBeUndefined()
  })

  it('has no invented safe addresses in the pilot catalog', () => {
    // Ručni preduvjet (doc 11 §7): adrese se upisuju tek kad organizator
    // deploya Safe — do tada kupnja mora biti onemogućena.
    EVENTS.forEach((event) => {
      expect(event.safeAddress).toBeUndefined()
    })
  })

  it('prices are parsable decimal strings on every tier', () => {
    EVENTS.flatMap((event) => event.tiers).forEach((tier) => {
      expect(tier.priceEur).toMatch(/^\d+\.\d{2}$/)
    })
  })

  it('honours the sale window boundaries inclusively', () => {
    const tier: TicketTierConfig = {
      id: 't',
      naziv: 'T',
      priceEur: '10.00',
      imenska: false,
      saleStartIso: '2027-01-01',
      saleEndIso: '2027-02-01',
    }

    expect(isTierOnSale(tier, '2026-12-31')).toBe(false)
    expect(isTierOnSale(tier, '2027-01-01')).toBe(true)
    expect(isTierOnSale(tier, '2027-02-01')).toBe(true)
    expect(isTierOnSale(tier, '2027-02-02')).toBe(false)
  })

  it('treats a tier without a window as always on sale', () => {
    const tier: TicketTierConfig = { id: 't', naziv: 'T', priceEur: '10.00', imenska: false }
    expect(isTierOnSale(tier, '1999-01-01')).toBe(true)
    expect(isTierOnSale(tier, '2999-01-01')).toBe(true)
  })
})
