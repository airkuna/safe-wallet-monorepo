import { http, HttpResponse } from 'msw'
import { server } from '@/src/tests/server'
import { confirmContribution, fetchActiveCampaign, fetchContributionStatus, slugToSubjectRefs } from './pinkaClient'
import type { PinkaCampaignRow } from './types'

const FUNCTIONS = 'https://donations.test/functions/v1'
const REST = 'https://donations.test/rest/v1'

let mockApiBaseUrl: string | undefined = FUNCTIONS
jest.mock('@/src/custom/brand', () => ({
  getBrand: () => ({
    id: 'test',
    name: 'Test',
    donations: mockApiBaseUrl === undefined ? undefined : { apiBaseUrl: mockApiBaseUrl },
  }),
}))

const TX_HASH = `0x${'ab'.repeat(32)}`

const campaignRow = (): PinkaCampaignRow => ({
  id: '00000000-0000-4000-8000-000000000c01',
  slug: 'moj-kanal-podrska',
  type: 'donation',
  title: 'Podrška kanalu',
  description: null,
  goal_cents: null,
  min_contribution_cents: 100,
  currency: 'eur',
  cover_image_url: null,
  state: 'active',
  destination_address: '0x1111111111111111111111111111111111111111',
  chain: 'gnosis',
  youtube_channel_id: null,
  total_raised_cents: 12500,
  contribution_count: 3,
  contributor_count: 2,
})

describe('slugToSubjectRefs', () => {
  it('sends both the underscore channel id and the raw slug', () => {
    expect(slugToSubjectRefs('moj-kanal')).toEqual(['moj_kanal', 'moj-kanal'])
  })

  it('deduplicates when the slug has no dashes', () => {
    expect(slugToSubjectRefs('kanal')).toEqual(['kanal'])
  })

  it('is empty for blank input', () => {
    expect(slugToSubjectRefs('  ')).toEqual([])
  })
})

describe('fetchActiveCampaign', () => {
  beforeEach(() => {
    mockApiBaseUrl = FUNCTIONS
    server.resetHandlers()
  })

  it('returns the campaign row and sends the pinka schema + anon key', async () => {
    let receivedHeaders: Record<string, string | null> = {}
    let receivedBody: Record<string, unknown> = {}
    server.use(
      http.post(`${REST}/rpc/active_campaign_for_subject`, async ({ request }) => {
        receivedHeaders = {
          apikey: request.headers.get('apikey'),
          profile: request.headers.get('content-profile'),
        }
        receivedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json([campaignRow()])
      }),
    )

    const result = await fetchActiveCampaign('moj-kanal')
    expect(result.kind).toBe('ok')
    if (result.kind === 'ok') {
      expect(result.campaign.title).toBe('Podrška kanalu')
      expect(result.campaign.destination_address).toBe('0x1111111111111111111111111111111111111111')
    }
    expect(receivedHeaders.profile).toBe('pinka_finance')
    expect(receivedHeaders.apikey).toBeTruthy()
    expect(receivedBody).toEqual({
      p_subject_type: 'podcast_channel',
      p_subject_refs: ['moj_kanal', 'moj-kanal'],
    })
  })

  it('maps an empty result to the authoritative not_found', async () => {
    server.use(http.post(`${REST}/rpc/active_campaign_for_subject`, () => HttpResponse.json([])))
    expect(await fetchActiveCampaign('bez-kampanje')).toEqual({ kind: 'not_found' })
  })

  it('is not_found for blank input without a request', async () => {
    expect(await fetchActiveCampaign('   ')).toEqual({ kind: 'not_found' })
  })

  it('maps 5xx and network failures to unreachable', async () => {
    server.use(
      http.post(`${REST}/rpc/active_campaign_for_subject`, () => HttpResponse.json({ error: 'x' }, { status: 500 })),
    )
    expect(await fetchActiveCampaign('moj-kanal')).toEqual({ kind: 'unreachable' })

    server.use(http.post(`${REST}/rpc/active_campaign_for_subject`, () => HttpResponse.error()))
    expect(await fetchActiveCampaign('moj-kanal')).toEqual({ kind: 'unreachable' })
  })

  it('is unreachable when the backend is not configured', async () => {
    mockApiBaseUrl = undefined
    expect(await fetchActiveCampaign('moj-kanal')).toEqual({ kind: 'unreachable' })
  })
})

describe('confirmContribution', () => {
  beforeEach(() => {
    mockApiBaseUrl = FUNCTIONS
    server.resetHandlers()
  })

  it('posts campaign_id + tx_hash and returns the confirm payload', async () => {
    let receivedBody: Record<string, unknown> = {}
    server.use(
      http.post(`${FUNCTIONS}/pinka-onchain-confirm`, async ({ request }) => {
        receivedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ok: true, mined: true, block: 123, credited: 1 })
      }),
    )

    const response = await confirmContribution('00000000-0000-4000-8000-000000000c01', TX_HASH)
    expect(receivedBody).toEqual({ campaign_id: '00000000-0000-4000-8000-000000000c01', tx_hash: TX_HASH })
    expect(response?.credited).toBe(1)
  })

  it('returns the not-yet-mined payload for a retry later', async () => {
    server.use(
      http.post(`${FUNCTIONS}/pinka-onchain-confirm`, () => HttpResponse.json({ ok: true, mined: false, credited: 0 })),
    )
    const response = await confirmContribution('c1', TX_HASH)
    expect(response?.mined).toBe(false)
  })

  it('returns null on 4xx/5xx and network failures (cron is the fallback)', async () => {
    server.use(
      http.post(`${FUNCTIONS}/pinka-onchain-confirm`, () =>
        HttpResponse.json({ error: 'unknown_campaign' }, { status: 404 }),
      ),
    )
    expect(await confirmContribution('c1', TX_HASH)).toBeNull()

    server.use(http.post(`${FUNCTIONS}/pinka-onchain-confirm`, () => HttpResponse.error()))
    expect(await confirmContribution('c1', TX_HASH)).toBeNull()
  })

  it('returns null when the backend is not configured', async () => {
    mockApiBaseUrl = undefined
    expect(await confirmContribution('c1', TX_HASH)).toBeNull()
  })
})

describe('fetchContributionStatus', () => {
  beforeEach(() => {
    mockApiBaseUrl = FUNCTIONS
    server.resetHandlers()
  })

  it('returns the status row', async () => {
    server.use(
      http.post(`${REST}/rpc/contribution_status`, () =>
        HttpResponse.json([{ state: 'paid', paid_at: '2026-07-22T12:00:00Z' }]),
      ),
    )
    expect(await fetchContributionStatus('00000000-0000-4000-8000-0000000000d1')).toEqual({
      state: 'paid',
      paid_at: '2026-07-22T12:00:00Z',
    })
  })

  it('returns null for an unknown contribution or failure', async () => {
    server.use(http.post(`${REST}/rpc/contribution_status`, () => HttpResponse.json([])))
    expect(await fetchContributionStatus('nepoznat')).toBeNull()

    server.use(http.post(`${REST}/rpc/contribution_status`, () => HttpResponse.error()))
    expect(await fetchContributionStatus('nepoznat')).toBeNull()
  })
})
