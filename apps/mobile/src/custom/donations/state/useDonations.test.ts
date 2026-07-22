/**
 * Stateful in-memory MMKV fake — testiramo perzistiranu semantiku zapisa
 * (dodavanje, tx hash, backend potvrda), isti obrazac kao events useTickets.
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

import {
  addDonation,
  clearDonationsForTesting,
  getDonations,
  markDonationConfirmed,
  markDonationPaid,
  type DonationRecord,
} from './useDonations'

const TX_HASH = `0x${'ab'.repeat(32)}`

const record = (overrides: Partial<DonationRecord> = {}): DonationRecord => ({
  id: 'don-1',
  slug: 'moj-kanal',
  campaignId: 'c1',
  campaignTitle: 'Podrška kanalu',
  destinationAddress: '0x1111111111111111111111111111111111111111',
  amountCents: 2500,
  createdAtMs: 1,
  ...overrides,
})

describe('useDonations state', () => {
  beforeEach(() => clearDonationsForTesting())

  it('persists donations newest-first', () => {
    addDonation(record({ id: 'don-1' }))
    addDonation(record({ id: 'don-2' }))
    expect(getDonations().map((r) => r.id)).toEqual(['don-2', 'don-1'])
  })

  it('attaches the tx hash to the right record', () => {
    addDonation(record({ id: 'don-1' }))
    addDonation(record({ id: 'don-2' }))
    markDonationPaid('don-1', TX_HASH)

    const byId = new Map(getDonations().map((r) => [r.id, r]))
    expect(byId.get('don-1')?.txHash).toBe(TX_HASH)
    expect(byId.get('don-2')?.txHash).toBeUndefined()
  })

  it('marks a donation as backend-confirmed', () => {
    addDonation(record({ txHash: TX_HASH }))
    markDonationConfirmed('don-1')
    expect(getDonations()[0].confirmed).toBe(true)
  })

  it('survives corrupt storage content', () => {
    mockMemory.set('donations/records', 'nije json')
    expect(getDonations()).toEqual([])
  })
})
