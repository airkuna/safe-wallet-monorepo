import { http, HttpResponse } from 'msw'
import { server } from '@/src/tests/server'
import { mapFeedRowToEvent, refreshEventCatalog } from './backendSource'
import { EVENTS, getEvent, getEventCatalog, resetEventCatalogForTesting, setBackendEvents } from './registry'
import type { FeedRow } from '../api/types'

const BASE = 'https://events.test/functions/v1'

let mockApiBaseUrl: string | undefined = BASE
jest.mock('@/src/custom/brand', () => ({
  getBrand: () => ({
    id: 'test',
    name: 'Test',
    events: mockApiBaseUrl === undefined ? undefined : { apiBaseUrl: mockApiBaseUrl },
  }),
}))

const feedRow = (overrides: Partial<FeedRow> = {}): FeedRow => ({
  campaign_id: '00000000-0000-4000-8000-000000000e01',
  slug: 'money-motion-2027',
  title: 'Money Motion 2027',
  state: 'active',
  destination_address: '0x1111111111111111111111111111111111111111',
  event: {
    event_type: 'konferencija',
    venue_name: 'Zagrebački velesajam',
    venue_city: 'Zagreb',
    starts_at: '2027-03-10T08:00:00+01:00',
    ends_at: '2027-03-11T20:00:00+01:00',
    description_hr: 'Vodeća FinTech konferencija.',
    organizer_name: 'Money Motion',
    organizer_email: 'tickets@money-motion.eu',
  },
  tiers: [
    {
      id: '00000000-0000-4000-8000-0000000000a1',
      title: 'Super Early Bird',
      price_cents: 14900,
      inventory_total: 100,
      inventory_claimed: 3,
      imenska: true,
      sale_end: '2026-12-31T23:59:59Z',
    },
  ],
  ...overrides,
})

describe('backendSource', () => {
  beforeEach(() => {
    mockApiBaseUrl = BASE
    server.resetHandlers()
    resetEventCatalogForTesting()
  })

  describe('mapFeedRowToEvent', () => {
    it('maps a feed row to an EventConfig with backend ids and cent-safe prices', () => {
      const event = mapFeedRowToEvent(feedRow())
      expect(event).toMatchObject({
        slug: 'money-motion-2027',
        backendCampaignId: '00000000-0000-4000-8000-000000000e01',
        naziv: 'Money Motion 2027',
        tip: 'konferencija',
        startIso: '2027-03-10',
        endIso: '2027-03-11',
        venue: { naziv: 'Zagrebački velesajam', grad: 'Zagreb' },
        safeAddress: '0x1111111111111111111111111111111111111111',
      })
      expect(event?.tiers[0]).toMatchObject({
        backendTierId: '00000000-0000-4000-8000-0000000000a1',
        priceEur: '149.00',
        imenska: true,
        saleEndIso: '2026-12-31',
      })
    })

    it('never invents a safe address: invalid destination stays unbuyable', () => {
      const event = mapFeedRowToEvent(feedRow({ destination_address: 'not-an-address' }))
      expect(event?.safeAddress).toBeUndefined()
    })

    it('coerces unknown event types to ostalo and skips broken tiers', () => {
      const event = mapFeedRowToEvent(
        feedRow({
          event: { ...feedRow().event, event_type: 'nesto_novo' },
          tiers: [
            { id: 't1', title: 'Bad', price_cents: 1.5, imenska: false },
            { id: 't2', title: 'Ok', price_cents: 4900, imenska: false },
          ],
        }),
      )
      expect(event?.tip).toBe('ostalo')
      expect(event?.tiers.map((tier) => tier.id)).toEqual(['t2'])
    })

    it('rejects rows without a slug', () => {
      expect(mapFeedRowToEvent(feedRow({ slug: '' }))).toBeNull()
    })
  })

  describe('catalog merge (config fallback)', () => {
    it('backend events win by slug while config-only events stay listed', () => {
      const backendEvent = mapFeedRowToEvent(feedRow())
      expect(backendEvent).not.toBeNull()
      if (backendEvent === null) {
        return
      }
      setBackendEvents([backendEvent])

      const catalog = getEventCatalog()
      expect(catalog[0].backendCampaignId).toBe('00000000-0000-4000-8000-000000000e01')
      // config-only event (BlockSplit) ostaje u katalogu
      expect(catalog.some((event) => event.slug === 'blocksplit-2027')).toBe(true)
      // getEvent rezolvira backend verziju
      expect(getEvent('money-motion-2027').backendCampaignId).toBeDefined()
    })

    it('reset returns the catalog to the config list', () => {
      const backendEvent = mapFeedRowToEvent(feedRow())
      if (backendEvent === null) {
        return
      }
      setBackendEvents([backendEvent])
      resetEventCatalogForTesting()
      expect(getEventCatalog()).toEqual(EVENTS)
    })
  })

  describe('refreshEventCatalog', () => {
    it('merges the backend feed into the catalog', async () => {
      server.use(http.get(`${BASE}/events-feed`, () => HttpResponse.json({ events: [feedRow()] })))
      expect(await refreshEventCatalog()).toBe(true)
      expect(getEvent('money-motion-2027').backendCampaignId).toBeDefined()
    })

    it('keeps the config catalog when the backend is unreachable', async () => {
      server.use(http.get(`${BASE}/events-feed`, () => HttpResponse.error()))
      expect(await refreshEventCatalog()).toBe(false)
      expect(getEventCatalog()).toEqual(EVENTS)
    })

    it('is a no-op without a configured backend', async () => {
      mockApiBaseUrl = undefined
      expect(await refreshEventCatalog()).toBe(false)
      expect(getEventCatalog()).toEqual(EVENTS)
    })
  })
})
