/**
 * Event-as-data: P2P ticketing bez posrednika — organizator prodaje ulaznice
 * izravno na vlastiti Safe (docs/whitelabel-wallet/11-dogadjaji-p2p-ticketing.md).
 * Katalog je config, ne kod (isti invariant kao Tržnica trgovci i FF klubovi);
 * cijene su decimalni EUR stringovi ("149.00") — nikad float.
 */

export type CurrencyConfig = {
  /** ERC-20 adresa tokena namire. */
  tokenAddress: string
  /** Chain na kojem žive organizatorov Safe i token. */
  chainId: string
  symbol: string
  decimals: number
}

export type EventType = 'konferencija' | 'koncert' | 'meetup' | 'kamp' | 'ostalo'

export type VenueConfig = {
  naziv: string
  adresa?: string
  grad: string
}

export type OrganizerConfig = {
  naziv: string
  email: string
  web?: string
  /** Identity `@username` organizatora (brandovi s identity packom). */
  username?: string
}

export type TicketTierConfig = {
  /** Stabilan identifikator unutar eventa (slug ili backend UUID). */
  id: string
  /**
   * Backend UUID tiera (pinka_finance.campaign_tiers.id) kad event dolazi s
   * backend kataloga (E2); config-only tieri ga nemaju → narudžba je lokalna.
   */
  backendTierId?: string
  naziv: string
  opisHr?: string
  /** Cijena u EUR kao decimalni string ("149.00") — bez floata. */
  priceEur: string
  /**
   * Imenska ulaznica: checkout traži ime i prezime po komadu (Money Motion
   * model — ulaznica glasi na ime i nije prenosiva).
   */
  imenska: boolean
  /** Maksimalno komada u jednoj narudžbi; izostavljeno → DEFAULT_MAX_PER_ORDER. */
  maxPoNarudzbi?: number
  /** ISO datum početka prodaje; izostavljeno → prodaja otvorena. */
  saleStartIso?: string
  /** ISO datum kraja prodaje; izostavljeno → bez roka. */
  saleEndIso?: string
  /** Npr. "uz predočenje potvrde o studentskom statusu na ulazu". */
  napomena?: string
}

export type EventConfig = {
  /** Stabilan identifikator eventa (slug). */
  slug: string
  /**
   * Backend UUID kampanje (pinka_finance.campaigns.id) kad event dolazi s
   * backend kataloga (E2); config-only eventi ga nemaju → narudžba je lokalna.
   */
  backendCampaignId?: string
  naziv: string
  opisHr: string
  opisEn?: string
  tip: EventType
  /** ISO datum (YYYY-MM-DD) početka; izostavljeno → event je najavljen bez termina. */
  startIso?: string
  endIso?: string
  venue: VenueConfig
  organizer: OrganizerConfig
  /**
   * Checksummed adresa organizatorovog Safe-a na chainu valute. Dok nije
   * deployan i upisan, kupnja je onemogućena u UI-ju (nikad ne izmišljamo
   * adrese) — event ostaje pregledan.
   */
  safeAddress?: string
  /** Override valute; izostavljeno → DEFAULT_CURRENCY (EURe na Gnosisu). */
  currency?: CurrencyConfig
  /** Prazno → event je najavljen, prodaja još nije krenula. */
  tiers: TicketTierConfig[]
  coverUrl?: string
}
