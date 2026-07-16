/**
 * Tipovi REST ugovora s domovina-api events funkcijama (events-feed,
 * events-order, events-confirm, events-tickets, events-checkin,
 * events-organizer). Server-side ugovor: domovina-api/supabase/functions/
 * events-* + docs/events-ticketing-curl-scenario.md.
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

/** Filtriranje/paginacija javnog feeda (E4); sve opcionalno = E2 ponašanje. */
export type EventsFeedParams = {
  /** Case-insensitive substring po gradu (events.venue_city). */
  grad?: string
  /** ISO donja granica events.starts_at. */
  from?: string
  /** ISO gornja granica events.starts_at. */
  to?: string
  limit?: number
  offset?: number
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

/** Poslovni ishod skena (redeem_ticket RPC kroz events-checkin). */
export type CheckinStatus = 'checked_in' | 'already_checked_in' | 'void' | 'not_found'

export type CheckinResponse = {
  status: CheckinStatus
  serial?: string
  holder_name?: string | null
  tier_title?: string | null
  event_title?: string | null
  checked_in_at?: string | null
  /** Tko je skenirao PRVI ulaz (samo kod already_checked_in). */
  checked_in_by_email?: string | null
  /** Ukupan broj ulazaka na eventu nakon ovog skena (brojač na pultu). */
  checked_in_count?: number
}

/**
 * Trostruki ishod check-ina: poslovni odgovor (uklj. already_checked_in) /
 * autoritativno odbijenje poziva (401/403/format) / backend nedostupan.
 */
export type CheckinResult =
  | { kind: 'ok'; response: CheckinResponse }
  | { kind: 'rejected'; code: string }
  | { kind: 'unreachable' }

// ── organizator self-service (E4; events-organizer action router) ───────────

export type OrganizerAccount = {
  id: string
  name: string
  is_personal: boolean
  /** Moderacija objave: bez allowlista publish je odbijen server-side. */
  allowlisted: boolean
  /** Postoji li DAC7 zapis organizatora (organizer_records). */
  has_record: boolean
}

export type OrganizerTier = {
  id: string
  title: string
  description?: string | null
  price_cents: number
  inventory_total?: number | null
  inventory_claimed?: number | null
  imenska: boolean
  sale_start?: string | null
  sale_end?: string | null
  sort?: number
}

export type OrganizerEvent = {
  campaign_id: string
  account_id: string
  slug: string
  title: string
  /** draft | active | funded | closed (state machine publish_event RPC-a). */
  state: string
  visibility: string
  destination_address?: string | null
  event?: FeedEventDetails | null
  tiers: OrganizerTier[]
}

export type OrganizerOverview = {
  accounts: OrganizerAccount[]
  events: OrganizerEvent[]
}

/** Tier payload za create/update; bez `id` = novi tier. */
export type OrganizerTierInput = {
  id?: string
  title: string
  price_cents: number
  inventory_total?: number | null
  imenska?: boolean
  description?: string
  sale_start?: string
  sale_end?: string
  sort?: number
}

export type CreateOrganizerEventInput = {
  /** Client-generated UUID — idempotency ključ (retry vraća postojeći event). */
  event_id: string
  account_id: string
  title: string
  venue_name: string
  venue_city: string
  event_type?: string
  /** Prazno = draft s placeholder adresom; publish je gated dok nema pravog Safe-a. */
  destination_address?: string
  venue_address?: string
  starts_at?: string
  ends_at?: string
  description_hr?: string
  description_en?: string
  organizer_name?: string
  organizer_email?: string
  organizer_web?: string
  tiers: OrganizerTierInput[]
}

/** Izostavljeno polje = ne dira se (update_event RPC semantika). */
export type UpdateOrganizerEventInput = {
  campaign_id: string
  title?: string
  destination_address?: string
  event_type?: string
  venue_name?: string
  venue_address?: string
  venue_city?: string
  starts_at?: string
  ends_at?: string
  description_hr?: string
  description_en?: string
  organizer_name?: string
  organizer_email?: string
  organizer_web?: string
  tiers?: OrganizerTierInput[]
}

export type CreateOrganizerEventResponse = {
  id: string
  slug: string
  existing: boolean
  event_created?: boolean
}

export type UpdateOrganizerEventResponse = {
  campaign_id: string
  updated: boolean
  tiers_updated: number
  tiers_added: number
}

export type PublishTargetState = 'active' | 'closed'

export type PublishOrganizerEventResponse = {
  campaign_id: string
  state: string
  visibility: string
}

/** DAC7 zapis organizatora — SENSITIVE, nikad u javnom feedu. */
export type OrganizerRecordInput = {
  account_id: string
  legal_name: string
  oib: string
  address_line: string
  city: string
  postal_code: string
  country_code?: string
  contact_email?: string
  financial_identifier_type: 'iban' | 'safe_address'
  financial_identifier: string
}

/**
 * Trostruki ishod organizatorske akcije: uspjeh / autoritativno odbijanje
 * (strojni kod, npr. organizer_not_allowlisted) / backend nedostupan.
 */
export type OrganizerResult<T> = { kind: 'ok'; data: T } | { kind: 'rejected'; code: string } | { kind: 'unreachable' }
