import type { EventConfig } from '../catalog/types'

/** Zajednička test fixture eventa — testovi ne ovise o stvarnom katalogu. */
export const TEST_EVENT_SAFE = '0x3333333333333333333333333333333333333333'

export const testEvent = (overrides: Partial<EventConfig> = {}): EventConfig => ({
  slug: 'test-conf',
  naziv: 'Test Conf',
  opisHr: 'Testna konferencija.',
  tip: 'konferencija',
  startIso: '2027-03-10',
  endIso: '2027-03-11',
  venue: { naziv: 'Testni velesajam', grad: 'Zagreb' },
  organizer: { naziv: 'Test Org', email: 'org@test.hr', web: 'test.hr' },
  safeAddress: TEST_EVENT_SAFE,
  tiers: [
    {
      id: 'regular',
      naziv: 'Regular',
      priceEur: '149.00',
      imenska: true,
    },
    {
      id: 'fan',
      naziv: 'Fan',
      priceEur: '20.00',
      imenska: false,
    },
  ],
  ...overrides,
})
