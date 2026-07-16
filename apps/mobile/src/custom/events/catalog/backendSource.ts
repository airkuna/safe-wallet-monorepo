import { useEffect, useSyncExternalStore } from 'react'
import { isAddress } from 'ethers'
import { fetchEventsFeed } from '../api/client'
import { isEventsBackendConfigured } from '../api/config'
import type { FeedRow, FeedTier } from '../api/types'
import { centsToEur } from '../logic/ticketOrder'
import { getEventCatalog, setBackendEvents, subscribeEventCatalog } from './registry'
import type { EventConfig, EventType, TicketTierConfig } from './types'

/**
 * Backend source kataloga (E2): events-feed → EventConfig, uz config fallback
 * u registry.ts. Sve promjene backend integracije kataloga žive u ovom
 * modulu — ekrani i dalje čitaju registry (getEvent/getTier) i hook ispod.
 */

const KNOWN_TYPES: readonly EventType[] = ['konferencija', 'koncert', 'meetup', 'kamp', 'ostalo']

const toIsoDate = (value: string | null | undefined): string | undefined => {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value ?? '')
  return match === null ? undefined : match[1]
}

const toOptionalText = (value: string | null | undefined): string | undefined => {
  const trimmed = (value ?? '').trim()
  return trimmed.length === 0 ? undefined : trimmed
}

const mapTier = (tier: FeedTier): TicketTierConfig | null => {
  if (!Number.isInteger(tier.price_cents) || tier.price_cents < 0) {
    return null
  }
  return {
    id: tier.id,
    backendTierId: tier.id,
    naziv: tier.title,
    opisHr: toOptionalText(tier.description),
    priceEur: centsToEur(tier.price_cents),
    imenska: tier.imenska === true,
    saleStartIso: toIsoDate(tier.sale_start),
    saleEndIso: toIsoDate(tier.sale_end),
  }
}

/** Feed red → EventConfig; nepotpuni redovi se preskaču (nikad ne ruše katalog). */
export const mapFeedRowToEvent = (row: FeedRow): EventConfig | null => {
  if (typeof row.slug !== 'string' || row.slug.length === 0 || typeof row.title !== 'string') {
    return null
  }
  const details = row.event ?? undefined
  const eventType = (details?.event_type ?? 'ostalo') as EventType
  const destination = row.destination_address ?? undefined
  return {
    slug: row.slug,
    backendCampaignId: row.campaign_id,
    naziv: row.title,
    opisHr: toOptionalText(details?.description_hr) ?? '',
    opisEn: toOptionalText(details?.description_en),
    tip: KNOWN_TYPES.includes(eventType) ? eventType : 'ostalo',
    startIso: toIsoDate(details?.starts_at),
    endIso: toIsoDate(details?.ends_at),
    venue: {
      naziv: toOptionalText(details?.venue_name) ?? '',
      adresa: toOptionalText(details?.venue_address),
      grad: toOptionalText(details?.venue_city) ?? '',
    },
    organizer: {
      naziv: toOptionalText(details?.organizer_name) ?? row.title,
      email: toOptionalText(details?.organizer_email) ?? '',
      web: toOptionalText(details?.organizer_web),
    },
    // Bez izmišljenih adresa: samo validna EVM adresa omogućuje kupnju.
    safeAddress: destination !== undefined && isAddress(destination) ? destination : undefined,
    tiers: (row.tiers ?? []).map(mapTier).filter((tier): tier is TicketTierConfig => tier !== null),
    coverUrl: toOptionalText(details?.cover_image_url),
  }
}

let refreshInFlight: Promise<boolean> | null = null

/**
 * Povuci backend katalog i merge-aj ga u registry. Vraća `true` kad je katalog
 * osvježen; backend nedostupan/nekonfiguriran → `false` (config fallback,
 * bez ikakvog utjecaja na E1 ponašanje). Paralelni pozivi se dedupliciraju.
 */
export const refreshEventCatalog = (): Promise<boolean> => {
  if (!isEventsBackendConfigured()) {
    return Promise.resolve(false)
  }
  if (refreshInFlight === null) {
    refreshInFlight = (async () => {
      try {
        const rows = await fetchEventsFeed()
        if (rows === null) {
          return false
        }
        const events = rows.map(mapFeedRowToEvent).filter((event): event is EventConfig => event !== null)
        setBackendEvents(events)
        return true
      } finally {
        refreshInFlight = null
      }
    })()
  }
  return refreshInFlight
}

/**
 * Katalog za ekrane: reaktivni snapshot + jedan refresh pokušaj na mount
 * (no-op bez konfiguriranog backenda).
 */
export const useEventCatalog = (): EventConfig[] => {
  const catalog = useSyncExternalStore(subscribeEventCatalog, getEventCatalog, getEventCatalog)
  useEffect(() => {
    void refreshEventCatalog()
  }, [])
  return catalog
}
