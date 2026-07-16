import { getEventsApiBaseUrl } from './config'
import type {
  BackendOrder,
  BackendOrderInfo,
  CheckinResponse,
  CheckinResult,
  ConfirmOrderResponse,
  CreateOrganizerEventInput,
  CreateOrganizerEventResponse,
  EventsFeedParams,
  EventsFeedResponse,
  FeedRow,
  OrganizerOverview,
  OrganizerRecordInput,
  OrganizerResult,
  PublishOrganizerEventResponse,
  PublishTargetState,
  SubmitOrderRequest,
  SubmitOrderResult,
  UpdateOrganizerEventInput,
  UpdateOrganizerEventResponse,
} from './types'

/**
 * Tanki REST klijent za domovina-api events funkcije. Semantika povratnih
 * vrijednosti je "graceful": mrežni pad / 5xx / nekonfiguriran backend vraća
 * `null` (odnosno `unreachable`) — pozivatelj tada čuva točno E1 ponašanje.
 * Backend NIKAD ne drži ključeve ni sredstva; plaćanje ide postojećim Send
 * flowom, ovdje putuju samo narudžbe i ulaznice.
 */

const REQUEST_TIMEOUT_MS = 10_000

const apiFetch = async (path: string, init?: RequestInit): Promise<Response | null> => {
  const base = getEventsApiBaseUrl()
  if (base === undefined) {
    return null
  }
  try {
    return await fetch(`${base}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch {
    return null
  }
}

const feedQueryString = (params?: EventsFeedParams): string => {
  if (params === undefined) {
    return ''
  }
  const search = new URLSearchParams()
  if (params.grad !== undefined && params.grad.trim().length > 0) {
    search.set('grad', params.grad.trim())
  }
  if (params.from !== undefined) {
    search.set('from', params.from)
  }
  if (params.to !== undefined) {
    search.set('to', params.to)
  }
  if (params.limit !== undefined) {
    search.set('limit', String(params.limit))
  }
  if (params.offset !== undefined) {
    search.set('offset', String(params.offset))
  }
  const query = search.toString()
  return query.length === 0 ? '' : `?${query}`
}

/**
 * Javni katalog evenata; `null` = backend nedostupan (ostaje config katalog).
 * Filtriranje (grad, datum) i paginacija su opcionalni (E4); bez parametara
 * ponašanje je identično E2.
 */
export const fetchEventsFeed = async (params?: EventsFeedParams): Promise<FeedRow[] | null> => {
  const response = await apiFetch(`/events-feed${feedQueryString(params)}`)
  if (response === null || !response.ok) {
    return null
  }
  try {
    const body = (await response.json()) as EventsFeedResponse
    return Array.isArray(body.events) ? body.events : null
  } catch {
    return null
  }
}

/**
 * Pending narudžba + rezervacija inventoryja (TTL na backendu). 4xx s
 * strojnim kodom (tier_sold_out, sale_ended, holders_incomplete…) je
 * autoritativno odbijanje; sve ostalo → `unreachable` (E1 fallback).
 */
export const submitTicketOrder = async (request: SubmitOrderRequest): Promise<SubmitOrderResult> => {
  const response = await apiFetch('/events-order', { method: 'POST', body: JSON.stringify(request) })
  if (response === null || response.status >= 500) {
    return { kind: 'unreachable' }
  }
  let body: unknown
  try {
    body = await response.json()
  } catch {
    return { kind: 'unreachable' }
  }
  if (!response.ok) {
    const code = (body as { error?: string }).error
    return typeof code === 'string' && code.length > 0 ? { kind: 'rejected', code } : { kind: 'unreachable' }
  }
  return { kind: 'ok', order: body as BackendOrderInfo }
}

/**
 * Potvrda uplate: backend verificira receipt na Gnosis RPC-u i idempotentno
 * izda ulaznice. `null` = nedostupan (retry kasnije).
 */
export const confirmTicketOrder = async (orderId: string, txHash: string): Promise<ConfirmOrderResponse | null> => {
  const response = await apiFetch('/events-confirm', {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId, tx_hash: txHash }),
  })
  if (response === null) {
    return null
  }
  try {
    return (await response.json()) as ConfirmOrderResponse
  } catch {
    return null
  }
}

/**
 * Check-in na ulazu (E3): redeem QR tokena kroz events-checkin. Autorizacija
 * je ISKLJUČIVO server-side — `authToken` je GoTrue JWT org admina (skener
 * samo prosljeđuje header; redeem_ticket RPC provjerava admin rolu). 4xx sa
 * strojnim kodom (not_authenticated, not_authorized, invalid_token) je
 * autoritativno odbijanje poziva; 5xx/mreža = `unreachable` (online-only MVP:
 * sken se NE priznaje bez backend potvrde).
 */
export const checkinTicket = async (qrToken: string, authToken: string): Promise<CheckinResult> => {
  const response = await apiFetch('/events-checkin', {
    method: 'POST',
    headers: { authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ qr_token: qrToken }),
  })
  if (response === null || response.status >= 500) {
    return { kind: 'unreachable' }
  }
  let body: unknown
  try {
    body = await response.json()
  } catch {
    return { kind: 'unreachable' }
  }
  if (!response.ok) {
    const code = (body as { error?: string }).error
    return typeof code === 'string' && code.length > 0 ? { kind: 'rejected', code } : { kind: 'unreachable' }
  }
  return { kind: 'ok', response: body as CheckinResponse }
}

/**
 * Organizatorska akcija kroz events-organizer action router (E4). `authToken`
 * je GoTrue JWT org admina — ISTI "pristupni token" obrazac kao skener (E3):
 * transport kredencijala, NE autorizacija. Tko smije kreirati/uređivati/
 * objaviti odlučuje isključivo backend (RLS org admin + KYC; publish dodatno
 * allowlist + pravi Safe). 4xx sa strojnim kodom = autoritativno odbijanje;
 * 5xx/mreža = `unreachable`.
 */
const organizerAction = async <T>(body: Record<string, unknown>, authToken: string): Promise<OrganizerResult<T>> => {
  const response = await apiFetch('/events-organizer', {
    method: 'POST',
    headers: { authorization: `Bearer ${authToken}` },
    body: JSON.stringify(body),
  })
  if (response === null || response.status >= 500) {
    return { kind: 'unreachable' }
  }
  let parsed: unknown
  try {
    parsed = await response.json()
  } catch {
    return { kind: 'unreachable' }
  }
  if (!response.ok) {
    const code = (parsed as { error?: string }).error
    return typeof code === 'string' && code.length > 0 ? { kind: 'rejected', code } : { kind: 'unreachable' }
  }
  return { kind: 'ok', data: parsed as T }
}

/** Moji org accounti (allowlist/DAC7 status) + moji eventi uklj. draftove. */
export const fetchOrganizerOverview = (authToken: string): Promise<OrganizerResult<OrganizerOverview>> =>
  organizerAction<OrganizerOverview>({ action: 'overview' }, authToken)

export const createOrganizerEvent = (
  input: CreateOrganizerEventInput,
  authToken: string,
): Promise<OrganizerResult<CreateOrganizerEventResponse>> =>
  organizerAction<CreateOrganizerEventResponse>({ action: 'create', ...input }, authToken)

export const updateOrganizerEvent = (
  input: UpdateOrganizerEventInput,
  authToken: string,
): Promise<OrganizerResult<UpdateOrganizerEventResponse>> =>
  organizerAction<UpdateOrganizerEventResponse>({ action: 'update', ...input }, authToken)

/**
 * State machine draft→active→closed. Publish gating je SERVER-SIDE (org
 * admin + allowlist + pravi Safe) — UI disabled state je samo zrcalo.
 */
export const publishOrganizerEvent = (
  campaignId: string,
  targetState: PublishTargetState,
  authToken: string,
): Promise<OrganizerResult<PublishOrganizerEventResponse>> =>
  organizerAction<PublishOrganizerEventResponse>(
    { action: 'publish', campaign_id: campaignId, target_state: targetState },
    authToken,
  )

/** DAC7 zapis organizatora (SENSITIVE — backend ga nikad ne vraća u feed). */
export const upsertOrganizerRecord = (
  input: OrganizerRecordInput,
  authToken: string,
): Promise<OrganizerResult<{ account_id: string; saved: boolean }>> =>
  organizerAction<{ account_id: string; saved: boolean }>({ action: 'record_upsert', ...input }, authToken)

/** Narudžbe + ulaznice (QR token stiže jednokratno). `null` = nedostupan. */
export const fetchBackendOrders = async (orderIds: string[]): Promise<BackendOrder[] | null> => {
  if (orderIds.length === 0) {
    return []
  }
  const response = await apiFetch('/events-tickets', {
    method: 'POST',
    body: JSON.stringify({ order_ids: orderIds }),
  })
  if (response === null || !response.ok) {
    return null
  }
  try {
    const body = (await response.json()) as { orders?: BackendOrder[] }
    return Array.isArray(body.orders) ? body.orders : null
  } catch {
    return null
  }
}
