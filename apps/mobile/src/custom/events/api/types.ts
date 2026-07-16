/**
 * Tipovi REST ugovora s domovina-api events funkcijama (events-feed,
 * events-order, events-confirm, events-tickets). Server-side ugovor:
 * domovina-api/supabase/functions/events-* + docs/events-ticketing-curl-scenario.md.
 */

export type FeedTier = {
  id: string
  title: string
  description?: string | null
  price_cents: number
  inventory_total?: number | null
  inventory_claimed?: number | null
  imenska: boolean
  sale_start?: string | null
  sale_end?: string | null
}

export type FeedEventDetails = {
  event_type?: string | null
  venue_name?: string | null
  venue_address?: string | null
  venue_city?: string | null
  starts_at?: string | null
  ends_at?: string | null
  timezone?: string | null
  description_hr?: string | null
  description_en?: string | null
  cover_image_url?: string | null
  organizer_name?: string | null
  organizer_email?: string | null
  organizer_web?: string | null
}

export type FeedRow = {
  campaign_id: string
  slug: string
  title: string
  state: string
  destination_address?: string | null
  event?: FeedEventDetails | null
  tiers: FeedTier[]
}

export type EventsFeedResponse = {
  events: FeedRow[]
}

export type SubmitOrderRequest = {
  order_id: string
  campaign_id: string
  tier_id: string
  quantity: number
  holders: { full_name: string; email?: string }[]
  payer_address?: string
}

export type BackendOrderInfo = {
  order_id: string
  state: string
  amount_cents: number
  currency: string
  destination_address: string
  expires_at?: string | null
  existing: boolean
}

/**
 * Trostruki ishod submissiona: backend prihvatio / backend eksplicitno odbio
 * (autoritativno kad je dostupan — npr. rasprodano) / backend nedostupan
 * (graceful fallback na E1 lokalnu narudžbu).
 */
export type SubmitOrderResult =
  | { kind: 'ok'; order: BackendOrderInfo }
  | { kind: 'rejected'; code: string }
  | { kind: 'unreachable' }

export type ConfirmOrderResponse = {
  ok?: boolean
  mined?: boolean
  status?: string
  order_id?: string
  serials?: string[]
  error?: string
}

export type BackendTicketState = 'issued' | 'checked_in' | 'void'

export type BackendTicket = {
  id: string
  serial: string
  holder_name?: string | null
  holder_email?: string | null
  state: BackendTicketState
  checked_in_at?: string | null
  /** Jednokratno isporučeni QR token; null nakon prve dostave. */
  qr_token?: string | null
}

export type BackendOrder = {
  order_id: string
  state: string
  quantity: number
  amount_cents: number
  currency: string
  expires_at?: string | null
  tx_hash?: string | null
  tickets: BackendTicket[]
}
