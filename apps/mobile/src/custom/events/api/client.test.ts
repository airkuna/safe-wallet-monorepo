import { http, HttpResponse } from 'msw'
import { server } from '@/src/tests/server'
import { confirmTicketOrder, fetchBackendOrders, fetchEventsFeed, submitTicketOrder } from './client'
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
})
