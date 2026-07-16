import { http, HttpResponse } from 'msw'
import { server } from '@/src/tests/server'
import {
  checkinTicket,
  confirmTicketOrder,
  createOrganizerEvent,
  fetchBackendOrders,
  fetchEventsFeed,
  fetchOrganizerOverview,
  publishOrganizerEvent,
  submitTicketOrder,
  updateOrganizerEvent,
  upsertOrganizerRecord,
} from './client'
import type { SubmitOrderRequest } from './types'

const BASE = 'https://events.test/functions/v1'

let mockApiBaseUrl: string | undefined = BASE
jest.mock('@/src/custom/brand', () => ({
  getBrand: () => ({
    id: 'test',
    name: 'Test',
    events: mockApiBaseUrl === undefined ? undefined : { apiBaseUrl: mockApiBaseUrl },
  }),
}))

const orderRequest = (): SubmitOrderRequest => ({
  order_id: '11111111-2222-4333-8444-555555555555',
  campaign_id: '00000000-0000-4000-8000-000000000e01',
  tier_id: '00000000-0000-4000-8000-00000000t001',
  quantity: 2,
  holders: [{ full_name: 'Ana Anić' }, { full_name: 'Ivo Ivić' }],
  payer_address: '0x2222222222222222222222222222222222222222',
})

describe('events api client', () => {
  beforeEach(() => {
    mockApiBaseUrl = BASE
    server.resetHandlers()
  })

  describe('fetchEventsFeed', () => {
    it('returns feed rows on success', async () => {
      server.use(
        http.get(`${BASE}/events-feed`, () =>
          HttpResponse.json({
            events: [{ campaign_id: 'c1', slug: 'momo', title: 'MoMo', state: 'active', tiers: [] }],
          }),
        ),
      )
      const rows = await fetchEventsFeed()
      expect(rows).toHaveLength(1)
      expect(rows?.[0].slug).toBe('momo')
    })

    it('returns null when the backend is not configured', async () => {
      mockApiBaseUrl = undefined
      expect(await fetchEventsFeed()).toBeNull()
    })

    it('returns null on server errors', async () => {
      server.use(http.get(`${BASE}/events-feed`, () => HttpResponse.json({ error: 'boom' }, { status: 500 })))
      expect(await fetchEventsFeed()).toBeNull()
    })

    it('returns null when the network is down', async () => {
      server.use(http.get(`${BASE}/events-feed`, () => HttpResponse.error()))
      expect(await fetchEventsFeed()).toBeNull()
    })

    it('passes filter and pagination params as a query string (E4)', async () => {
      let receivedUrl = ''
      server.use(
        http.get(`${BASE}/events-feed`, ({ request }) => {
          receivedUrl = request.url
          return HttpResponse.json({ events: [] })
        }),
      )
      await fetchEventsFeed({ grad: 'Split', from: '2027-01-01', limit: 10, offset: 20 })
      const url = new URL(receivedUrl)
      expect(url.searchParams.get('grad')).toBe('Split')
      expect(url.searchParams.get('from')).toBe('2027-01-01')
      expect(url.searchParams.get('limit')).toBe('10')
      expect(url.searchParams.get('offset')).toBe('20')
    })

    it('sends no query string without params (E2 behaviour preserved)', async () => {
      let receivedUrl = ''
      server.use(
        http.get(`${BASE}/events-feed`, ({ request }) => {
          receivedUrl = request.url
          return HttpResponse.json({ events: [] })
        }),
      )
      await fetchEventsFeed()
      expect(receivedUrl.endsWith('/events-feed')).toBe(true)
    })
  })

  describe('submitTicketOrder', () => {
    it('returns the created order on success', async () => {
      server.use(
        http.post(`${BASE}/events-order`, () =>
          HttpResponse.json({
            order_id: '11111111-2222-4333-8444-555555555555',
            state: 'pending',
            amount_cents: 29800,
            currency: 'eur',
            destination_address: '0x1111111111111111111111111111111111111111',
            existing: false,
          }),
        ),
      )
      const result = await submitTicketOrder(orderRequest())
      expect(result.kind).toBe('ok')
      if (result.kind === 'ok') {
        expect(result.order.amount_cents).toBe(29800)
      }
    })

    it('maps machine-code 4xx responses to an authoritative rejection', async () => {
      server.use(
        http.post(`${BASE}/events-order`, () => HttpResponse.json({ error: 'tier_sold_out' }, { status: 400 })),
      )
      expect(await submitTicketOrder(orderRequest())).toEqual({ kind: 'rejected', code: 'tier_sold_out' })
    })

    it('maps 5xx and network failures to unreachable (E1 fallback)', async () => {
      server.use(http.post(`${BASE}/events-order`, () => HttpResponse.json({ error: 'oops' }, { status: 503 })))
      expect(await submitTicketOrder(orderRequest())).toEqual({ kind: 'unreachable' })

      server.use(http.post(`${BASE}/events-order`, () => HttpResponse.error()))
      expect(await submitTicketOrder(orderRequest())).toEqual({ kind: 'unreachable' })
    })
  })

  describe('confirmTicketOrder', () => {
    it('returns the confirmation payload', async () => {
      server.use(
        http.post(`${BASE}/events-confirm`, () =>
          HttpResponse.json({ ok: true, mined: true, status: 'paid', serials: ['MON-000001'] }),
        ),
      )
      const response = await confirmTicketOrder('11111111-2222-4333-8444-555555555555', `0x${'ab'.repeat(32)}`)
      expect(response?.status).toBe('paid')
      expect(response?.serials).toEqual(['MON-000001'])
    })

    it('returns null when unreachable', async () => {
      server.use(http.post(`${BASE}/events-confirm`, () => HttpResponse.error()))
      expect(await confirmTicketOrder('11111111-2222-4333-8444-555555555555', `0x${'ab'.repeat(32)}`)).toBeNull()
    })
  })

  describe('fetchBackendOrders', () => {
    it('short-circuits on an empty id list without a request', async () => {
      expect(await fetchBackendOrders([])).toEqual([])
    })

    it('returns orders with tickets', async () => {
      server.use(
        http.post(`${BASE}/events-tickets`, () =>
          HttpResponse.json({
            orders: [
              {
                order_id: 'o1',
                state: 'paid',
                quantity: 1,
                amount_cents: 14900,
                currency: 'eur',
                tickets: [{ id: 't1', serial: 'MON-000001', state: 'issued', qr_token: 'aa'.repeat(32) }],
              },
            ],
          }),
        ),
      )
      const orders = await fetchBackendOrders(['o1'])
      expect(orders?.[0].tickets[0].serial).toBe('MON-000001')
    })

    it('returns null on failure', async () => {
      server.use(http.post(`${BASE}/events-tickets`, () => HttpResponse.json({ error: 'x' }, { status: 500 })))
      expect(await fetchBackendOrders(['o1'])).toBeNull()
    })
  })

  describe('checkinTicket', () => {
    const TOKEN = 'ab'.repeat(32)

    it('sends the bearer token and returns the check-in response', async () => {
      let receivedAuth: string | null = null
      server.use(
        http.post(`${BASE}/events-checkin`, ({ request }) => {
          receivedAuth = request.headers.get('authorization')
          return HttpResponse.json({
            status: 'checked_in',
            serial: 'MON-000001',
            holder_name: 'Ana Anić',
            tier_title: 'Regular',
            checked_in_count: 1,
          })
        }),
      )
      const result = await checkinTicket(TOKEN, 'jwt-org-admina')
      expect(receivedAuth).toBe('Bearer jwt-org-admina')
      expect(result.kind).toBe('ok')
      if (result.kind === 'ok') {
        expect(result.response.status).toBe('checked_in')
        expect(result.response.holder_name).toBe('Ana Anić')
        expect(result.response.checked_in_count).toBe(1)
      }
    })

    it('returns the already_checked_in business outcome as ok (anti-double-entry data)', async () => {
      server.use(
        http.post(`${BASE}/events-checkin`, () =>
          HttpResponse.json({
            status: 'already_checked_in',
            serial: 'MON-000001',
            checked_in_at: '2027-03-10T09:00:00Z',
            checked_in_by_email: 'admin@momo.test',
            checked_in_count: 42,
          }),
        ),
      )
      const result = await checkinTicket(TOKEN, 'jwt')
      expect(result.kind).toBe('ok')
      if (result.kind === 'ok') {
        expect(result.response.status).toBe('already_checked_in')
        expect(result.response.checked_in_by_email).toBe('admin@momo.test')
      }
    })

    it('maps 401/403 machine codes to an authoritative rejection', async () => {
      server.use(
        http.post(`${BASE}/events-checkin`, () => HttpResponse.json({ error: 'not_authenticated' }, { status: 401 })),
      )
      expect(await checkinTicket(TOKEN, 'stari-jwt')).toEqual({ kind: 'rejected', code: 'not_authenticated' })

      server.use(
        http.post(`${BASE}/events-checkin`, () => HttpResponse.json({ error: 'not_authorized' }, { status: 403 })),
      )
      expect(await checkinTicket(TOKEN, 'jwt-ne-admina')).toEqual({ kind: 'rejected', code: 'not_authorized' })
    })

    it('maps 5xx and network failures to unreachable (online-only: scan not honoured)', async () => {
      server.use(http.post(`${BASE}/events-checkin`, () => HttpResponse.json({ error: 'x' }, { status: 500 })))
      expect(await checkinTicket(TOKEN, 'jwt')).toEqual({ kind: 'unreachable' })

      server.use(http.post(`${BASE}/events-checkin`, () => HttpResponse.error()))
      expect(await checkinTicket(TOKEN, 'jwt')).toEqual({ kind: 'unreachable' })
    })

    it('is unreachable when the backend is not configured', async () => {
      mockApiBaseUrl = undefined
      expect(await checkinTicket(TOKEN, 'jwt')).toEqual({ kind: 'unreachable' })
    })
  })

  describe('organizer actions (E4)', () => {
    it('sends the bearer token and the action to events-organizer', async () => {
      let receivedAuth: string | null = null
      let receivedBody: Record<string, unknown> = {}
      server.use(
        http.post(`${BASE}/events-organizer`, async ({ request }) => {
          receivedAuth = request.headers.get('authorization')
          receivedBody = (await request.json()) as Record<string, unknown>
          return HttpResponse.json({ accounts: [], events: [] })
        }),
      )
      const result = await fetchOrganizerOverview('jwt-org-admina')
      expect(receivedAuth).toBe('Bearer jwt-org-admina')
      expect(receivedBody.action).toBe('overview')
      expect(result.kind).toBe('ok')
      if (result.kind === 'ok') {
        expect(result.data.accounts).toEqual([])
      }
    })

    it('creates an event with idempotency id and tiers', async () => {
      let receivedBody: Record<string, unknown> = {}
      server.use(
        http.post(`${BASE}/events-organizer`, async ({ request }) => {
          receivedBody = (await request.json()) as Record<string, unknown>
          return HttpResponse.json({ id: 'e1', slug: 'blocksplit-2027', existing: false, event_created: true })
        }),
      )
      const result = await createOrganizerEvent(
        {
          event_id: '11111111-2222-4333-8444-555555555555',
          account_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          title: 'BlockSplit 2027',
          venue_name: 'MEDILS',
          venue_city: 'Split',
          tiers: [{ title: 'Stay paket', price_cents: 39900, imenska: true }],
        },
        'jwt',
      )
      expect(receivedBody.action).toBe('create')
      expect(receivedBody.event_id).toBe('11111111-2222-4333-8444-555555555555')
      expect(result.kind).toBe('ok')
    })

    it('maps the allowlist publish rejection to an authoritative code (server-side gating)', async () => {
      server.use(
        http.post(`${BASE}/events-organizer`, () =>
          HttpResponse.json({ error: 'organizer_not_allowlisted' }, { status: 400 }),
        ),
      )
      expect(await publishOrganizerEvent('c1', 'active', 'jwt')).toEqual({
        kind: 'rejected',
        code: 'organizer_not_allowlisted',
      })
    })

    it('maps the missing-Safe publish rejection (no address ⇒ no publish)', async () => {
      server.use(
        http.post(`${BASE}/events-organizer`, () =>
          HttpResponse.json({ error: 'campaign_destination_missing' }, { status: 400 }),
        ),
      )
      expect(await publishOrganizerEvent('c1', 'active', 'jwt')).toEqual({
        kind: 'rejected',
        code: 'campaign_destination_missing',
      })
    })

    it('maps tier_locked update rejection after publish', async () => {
      server.use(
        http.post(`${BASE}/events-organizer`, () => HttpResponse.json({ error: 'tier_locked' }, { status: 400 })),
      )
      expect(await updateOrganizerEvent({ campaign_id: 'c1', tiers: [] }, 'jwt')).toEqual({
        kind: 'rejected',
        code: 'tier_locked',
      })
    })

    it('upserts the DAC7 organizer record', async () => {
      let receivedBody: Record<string, unknown> = {}
      server.use(
        http.post(`${BASE}/events-organizer`, async ({ request }) => {
          receivedBody = (await request.json()) as Record<string, unknown>
          return HttpResponse.json({ account_id: 'a1', saved: true })
        }),
      )
      const result = await upsertOrganizerRecord(
        {
          account_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          legal_name: 'UBIK udruga',
          oib: '12345678901',
          address_line: 'Ulica 1',
          city: 'Split',
          postal_code: '21000',
          financial_identifier_type: 'safe_address',
          financial_identifier: '0x1111111111111111111111111111111111111111',
        },
        'jwt',
      )
      expect(receivedBody.action).toBe('record_upsert')
      expect(result.kind).toBe('ok')
    })

    it('maps 401/403 and 5xx/network like the scanner client', async () => {
      server.use(
        http.post(`${BASE}/events-organizer`, () => HttpResponse.json({ error: 'not_authenticated' }, { status: 401 })),
      )
      expect(await fetchOrganizerOverview('istekli-jwt')).toEqual({ kind: 'rejected', code: 'not_authenticated' })

      server.use(http.post(`${BASE}/events-organizer`, () => HttpResponse.json({ error: 'x' }, { status: 500 })))
      expect(await fetchOrganizerOverview('jwt')).toEqual({ kind: 'unreachable' })

      server.use(http.post(`${BASE}/events-organizer`, () => HttpResponse.error()))
      expect(await fetchOrganizerOverview('jwt')).toEqual({ kind: 'unreachable' })
    })

    it('is unreachable when the backend is not configured', async () => {
      mockApiBaseUrl = undefined
      expect(await fetchOrganizerOverview('jwt')).toEqual({ kind: 'unreachable' })
    })
  })
})
