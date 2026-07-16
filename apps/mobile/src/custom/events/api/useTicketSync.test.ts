/**
 * Stateful in-memory MMKV fake — testiramo upravo sync semantiku nad
 * perzistiranim narudžbama (attach backend id → confirm → merge ulaznica).
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

const BASE = 'https://events.test/functions/v1'

let mockApiBaseUrl: string | undefined = BASE
jest.mock('@/src/custom/brand', () => ({
  getBrand: () => ({
    id: 'test',
    name: 'Test',
    events: mockApiBaseUrl === undefined ? undefined : { apiBaseUrl: mockApiBaseUrl },
  }),
}))

import { http, HttpResponse } from 'msw'
import { server } from '@/src/tests/server'
import { submitOrder, syncTicketOrders } from './useTicketSync'
import {
  addTicketOrder,
  clearTicketOrdersForTesting,
  getTicketOrders,
  markTicketOrderPaid,
  type TicketOrder,
} from '../state/useTickets'
import type { EventConfig } from '../catalog/types'

const TX_HASH = `0x${'ab'.repeat(32)}`

const backendEvent = (): EventConfig => ({
  slug: 'money-motion-2027',
  backendCampaignId: '00000000-0000-4000-8000-000000000e01',
  naziv: 'Money Motion 2027',
  opisHr: 'Test',
  tip: 'konferencija',
  venue: { naziv: 'Velesajam', grad: 'Zagreb' },
  organizer: { naziv: 'MoMo', email: 'tickets@example.com' },
  safeAddress: '0x1111111111111111111111111111111111111111',
  tiers: [
    {
      id: 'seb',
      backendTierId: '00000000-0000-4000-8000-0000000000a1',
      naziv: 'Super Early Bird',
      priceEur: '149.00',
      imenska: true,
    },
  ],
})

const submitParams = () => {
  const event = backendEvent()
  return {
    event,
    tier: event.tiers[0],
    quantity: 2,
    holders: [
      { fullName: 'Ana Anić', email: 'ana@example.com' },
      { fullName: 'Ivo Ivić', email: '' },
    ],
    totals: { unitEur: '149.00', totalEur: '298.00' },
    payerSafeAddress: '0x2222222222222222222222222222222222222222',
  }
}

const localOrder = (overrides: Partial<TicketOrder> = {}): TicketOrder => ({
  id: 'MON-REF-1',
  reference: 'MON-REF-1',
  eventSlug: 'money-motion-2027',
  tierId: 'seb',
  quantity: 2,
  holders: [{ fullName: 'Ana Anić' }, { fullName: 'Ivo Ivić' }],
  totals: { unitEur: '149.00', totalEur: '298.00' },
  currencySymbol: 'EURe',
  status: 'pending',
  createdAtMs: 1,
  ...overrides,
})

describe('useTicketSync', () => {
  beforeEach(() => {
    mockApiBaseUrl = BASE
    server.resetHandlers()
    clearTicketOrdersForTesting()
  })

  describe('submitOrder', () => {
    it('creates a backend order and returns its id', async () => {
      let capturedBody: Record<string, unknown> = {}
      server.use(
        http.post(`${BASE}/events-order`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>
          return HttpResponse.json({
            order_id: capturedBody.order_id,
            state: 'pending',
            amount_cents: 29800,
            currency: 'eur',
            destination_address: '0x1111111111111111111111111111111111111111',
            existing: false,
          })
        }),
      )

      const outcome = await submitOrder(submitParams())
      expect(outcome.kind).toBe('ok')
      expect(capturedBody.campaign_id).toBe('00000000-0000-4000-8000-000000000e01')
      expect(capturedBody.tier_id).toBe('00000000-0000-4000-8000-0000000000a1')
      expect(capturedBody.holders).toEqual([
        { full_name: 'Ana Anić', email: 'ana@example.com' },
        { full_name: 'Ivo Ivić' },
      ])
    })

    it('is skipped for config-only events (no backend ids)', async () => {
      const params = submitParams()
      params.event = { ...params.event, backendCampaignId: undefined }
      expect(await submitOrder(params)).toEqual({ kind: 'skipped' })
    })

    it('is skipped when no backend is configured', async () => {
      mockApiBaseUrl = undefined
      expect(await submitOrder(submitParams())).toEqual({ kind: 'skipped' })
    })

    it('falls back to skipped when the backend is unreachable', async () => {
      server.use(http.post(`${BASE}/events-order`, () => HttpResponse.error()))
      expect(await submitOrder(submitParams())).toEqual({ kind: 'skipped' })
    })

    it('propagates authoritative rejections', async () => {
      server.use(
        http.post(`${BASE}/events-order`, () => HttpResponse.json({ error: 'tier_sold_out' }, { status: 400 })),
      )
      expect(await submitOrder(submitParams())).toEqual({ kind: 'rejected', code: 'tier_sold_out' })
    })

    it('rejects on backend/local amount drift', async () => {
      server.use(
        http.post(`${BASE}/events-order`, () =>
          HttpResponse.json({
            order_id: 'x',
            state: 'pending',
            amount_cents: 31800, // backend zna drugu cijenu
            currency: 'eur',
            destination_address: '0x1111111111111111111111111111111111111111',
            existing: false,
          }),
        ),
      )
      expect(await submitOrder(submitParams())).toEqual({ kind: 'rejected', code: 'amount_mismatch' })
    })
  })

  describe('syncTicketOrders', () => {
    it('confirms unconfirmed paid orders and merges issued tickets', async () => {
      addTicketOrder(localOrder({ backendOrderId: 'be-1' }))
      markTicketOrderPaid('MON-REF-1', TX_HASH)

      const confirmCalls: Record<string, unknown>[] = []
      server.use(
        http.post(`${BASE}/events-confirm`, async ({ request }) => {
          confirmCalls.push((await request.json()) as Record<string, unknown>)
          return HttpResponse.json({ ok: true, mined: true, status: 'paid', serials: ['MON-000001', 'MON-000002'] })
        }),
        http.post(`${BASE}/events-tickets`, () =>
          HttpResponse.json({
            orders: [
              {
                order_id: 'be-1',
                state: 'paid',
                quantity: 2,
                amount_cents: 29800,
                currency: 'eur',
                tickets: [
                  {
                    id: 't1',
                    serial: 'MON-000001',
                    holder_name: 'Ana Anić',
                    state: 'issued',
                    qr_token: 'aa'.repeat(32),
                  },
                  {
                    id: 't2',
                    serial: 'MON-000002',
                    holder_name: 'Ivo Ivić',
                    state: 'issued',
                    qr_token: 'bb'.repeat(32),
                  },
                ],
              },
            ],
          }),
        ),
      )

      await syncTicketOrders()

      expect(confirmCalls).toEqual([{ order_id: 'be-1', tx_hash: TX_HASH }])
      const [order] = getTicketOrders()
      expect(order.status).toBe('issued')
      expect(order.backendState).toBe('paid')
      expect(order.confirmedTxHash).toBe(TX_HASH)
      expect(order.tickets).toHaveLength(2)
      expect(order.tickets?.[0].qrToken).toBe('aa'.repeat(32))
    })

    it('preserves already delivered QR tokens when the backend returns null on refetch', async () => {
      addTicketOrder(
        localOrder({
          backendOrderId: 'be-1',
          backendState: 'paid',
          confirmedTxHash: TX_HASH,
          txHash: TX_HASH,
          status: 'issued',
          tickets: [{ serial: 'MON-000001', holderName: 'Ana Anić', state: 'issued', qrToken: 'aa'.repeat(32) }],
        }),
      )

      server.use(
        http.post(`${BASE}/events-tickets`, () =>
          HttpResponse.json({
            orders: [
              {
                order_id: 'be-1',
                state: 'paid',
                quantity: 1,
                amount_cents: 14900,
                currency: 'eur',
                // jednokratna dostava: refetch više NE nosi token
                tickets: [{ id: 't1', serial: 'MON-000001', holder_name: 'Ana Anić', state: 'issued', qr_token: null }],
              },
            ],
          }),
        ),
      )

      await syncTicketOrders()

      const [order] = getTicketOrders()
      expect(order.tickets?.[0].qrToken).toBe('aa'.repeat(32))
    })

    it('is a silent no-op when the backend is unreachable (offline)', async () => {
      addTicketOrder(localOrder({ backendOrderId: 'be-1', txHash: TX_HASH }))
      server.use(
        http.post(`${BASE}/events-confirm`, () => HttpResponse.error()),
        http.post(`${BASE}/events-tickets`, () => HttpResponse.error()),
      )

      await expect(syncTicketOrders()).resolves.toBeUndefined()
      const [order] = getTicketOrders()
      expect(order.backendState).toBeUndefined()
      expect(order.tickets).toBeUndefined()
    })

    it('does nothing for purely local (E1) orders', async () => {
      addTicketOrder(localOrder())
      let called = false
      server.use(
        http.post(`${BASE}/events-tickets`, () => {
          called = true
          return HttpResponse.json({ orders: [] })
        }),
      )
      await syncTicketOrders()
      expect(called).toBe(false)
    })
  })
})
