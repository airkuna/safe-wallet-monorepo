/**
 * Stateful in-memory MMKV fake — testiramo sync semantiku nad perzistiranim
 * donacijama (zapis → best-effort confirm → retroaktivni sync).
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

const FUNCTIONS = 'https://donations.test/functions/v1'

let mockApiBaseUrl: string | undefined = FUNCTIONS
jest.mock('@/src/custom/brand', () => ({
  getBrand: () => ({
    id: 'test',
    name: 'Test',
    donations: mockApiBaseUrl === undefined ? undefined : { apiBaseUrl: mockApiBaseUrl },
  }),
}))

import { http, HttpResponse } from 'msw'
import { server } from '@/src/tests/server'
import { recordDonation, recordDonationPayment, randomUuid, syncDonations } from './useDonationSync'
import { addDonation, clearDonationsForTesting, getDonations, type DonationRecord } from '../state/useDonations'

const TX_HASH = `0x${'ab'.repeat(32)}`

const localRecord = (overrides: Partial<DonationRecord> = {}): DonationRecord => ({
  id: 'don-1',
  slug: 'moj-kanal',
  campaignId: 'c1',
  campaignTitle: 'Podrška kanalu',
  destinationAddress: '0x1111111111111111111111111111111111111111',
  amountCents: 2500,
  createdAtMs: 1,
  ...overrides,
})

describe('useDonationSync', () => {
  beforeEach(() => {
    mockApiBaseUrl = FUNCTIONS
    server.resetHandlers()
    clearDonationsForTesting()
  })

  describe('randomUuid', () => {
    it('generates a v4 uuid', () => {
      expect(randomUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    })
  })

  describe('recordDonation', () => {
    it('persists the record without a network call when there is no tx hash yet', async () => {
      let confirmCalled = false
      server.use(
        http.post(`${FUNCTIONS}/pinka-onchain-confirm`, () => {
          confirmCalled = true
          return HttpResponse.json({ ok: true, mined: true, credited: 1 })
        }),
      )

      const record = await recordDonation({
        slug: 'moj-kanal',
        campaignId: 'c1',
        campaignTitle: 'Podrška kanalu',
        destinationAddress: '0x1111111111111111111111111111111111111111',
        amountCents: 2500,
      })

      expect(confirmCalled).toBe(false)
      expect(getDonations()).toEqual([expect.objectContaining({ id: record.id, amountCents: 2500 })])
    })

    it('confirms best-effort when the tx hash is known', async () => {
      const confirmCalls: Record<string, unknown>[] = []
      server.use(
        http.post(`${FUNCTIONS}/pinka-onchain-confirm`, async ({ request }) => {
          confirmCalls.push((await request.json()) as Record<string, unknown>)
          return HttpResponse.json({ ok: true, mined: true, credited: 1 })
        }),
      )

      await recordDonation({
        slug: 'moj-kanal',
        campaignId: 'c1',
        campaignTitle: 'Podrška kanalu',
        destinationAddress: '0x1111111111111111111111111111111111111111',
        amountCents: 2500,
        txHash: TX_HASH,
      })

      expect(confirmCalls).toEqual([{ campaign_id: 'c1', tx_hash: TX_HASH }])
      expect(getDonations()[0].confirmed).toBe(true)
    })

    it('keeps the record when the confirm fails (cron is the fallback)', async () => {
      server.use(http.post(`${FUNCTIONS}/pinka-onchain-confirm`, () => HttpResponse.error()))

      await recordDonation({
        slug: 'moj-kanal',
        campaignId: 'c1',
        campaignTitle: 'Podrška kanalu',
        destinationAddress: '0x1111111111111111111111111111111111111111',
        amountCents: 2500,
        txHash: TX_HASH,
      })

      const [record] = getDonations()
      expect(record.txHash).toBe(TX_HASH)
      expect(record.confirmed).toBeUndefined()
    })
  })

  describe('recordDonationPayment', () => {
    it('attaches the tx hash and confirms immediately', async () => {
      addDonation(localRecord())
      server.use(
        http.post(`${FUNCTIONS}/pinka-onchain-confirm`, () =>
          HttpResponse.json({ ok: true, mined: true, credited: 1 }),
        ),
      )

      await recordDonationPayment('don-1', TX_HASH)

      const [record] = getDonations()
      expect(record.txHash).toBe(TX_HASH)
      expect(record.confirmed).toBe(true)
    })
  })

  describe('syncDonations', () => {
    it('retroactively confirms records with an unconfirmed tx hash', async () => {
      addDonation(localRecord({ id: 'don-1', txHash: TX_HASH }))
      addDonation(localRecord({ id: 'don-2' })) // bez txHash — ne dira se
      addDonation(localRecord({ id: 'don-3', txHash: TX_HASH, confirmed: true })) // već potvrđena

      const confirmCalls: Record<string, unknown>[] = []
      server.use(
        http.post(`${FUNCTIONS}/pinka-onchain-confirm`, async ({ request }) => {
          confirmCalls.push((await request.json()) as Record<string, unknown>)
          return HttpResponse.json({ ok: true, mined: true, credited: 1 })
        }),
      )

      await syncDonations()

      expect(confirmCalls).toHaveLength(1)
      const byId = new Map(getDonations().map((r) => [r.id, r]))
      expect(byId.get('don-1')?.confirmed).toBe(true)
      expect(byId.get('don-2')?.confirmed).toBeUndefined()
    })

    it('leaves an unmined tx unconfirmed for the next retry', async () => {
      addDonation(localRecord({ txHash: TX_HASH }))
      server.use(
        http.post(`${FUNCTIONS}/pinka-onchain-confirm`, () =>
          HttpResponse.json({ ok: true, mined: false, credited: 0 }),
        ),
      )

      await syncDonations()
      expect(getDonations()[0].confirmed).toBeUndefined()
    })

    it('is a silent no-op when the backend is unreachable (offline)', async () => {
      addDonation(localRecord({ txHash: TX_HASH }))
      server.use(http.post(`${FUNCTIONS}/pinka-onchain-confirm`, () => HttpResponse.error()))

      await expect(syncDonations()).resolves.toBeUndefined()
      expect(getDonations()[0].confirmed).toBeUndefined()
    })

    it('does nothing when the backend is not configured', async () => {
      mockApiBaseUrl = undefined
      addDonation(localRecord({ txHash: TX_HASH }))
      let called = false
      server.use(
        http.post(`${FUNCTIONS}/pinka-onchain-confirm`, () => {
          called = true
          return HttpResponse.json({ ok: true })
        }),
      )
      await syncDonations()
      expect(called).toBe(false)
    })
  })
})
