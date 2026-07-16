import { getEventsApiBaseUrl } from './config'
import type {
  BackendOrder,
  BackendOrderInfo,
  CheckinResponse,
  CheckinResult,
  ConfirmOrderResponse,
  EventsFeedResponse,
  FeedRow,
  SubmitOrderRequest,
  SubmitOrderResult,
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

/** Javni katalog evenata; `null` = backend nedostupan (ostaje config katalog). */
export const fetchEventsFeed = async (): Promise<FeedRow[] | null> => {
  const response = await apiFetch('/events-feed')
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
